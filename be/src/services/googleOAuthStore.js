// Penyimpanan kredensial & state OAuth Google di Supabase PostgreSQL.
//
//   google_oauth_credentials : SATU baris (id = 'primary'): status koneksi + refresh token TERENKRIPSI.
//   google_oauth_states      : state OAuth sekali pakai (hash) + PKCE code_verifier terenkripsi.
//
// Aturan keamanan modul ini:
//   - Refresh token / code_verifier hanya masuk dan keluar dalam bentuk ciphertext AES-256-GCM
//     (utils/tokenCrypto.js); plaintext ada di memori sesaat dan tidak pernah di-log.
//   - Objek yang dikembalikan ke lapisan lain (toPublic) TIDAK berisi token apa pun.
//   - Access token tidak pernah disimpan di sini.
const crypto = require("node:crypto");
const AppError = require("../utils/AppError");

const CREDENTIALS_TABLE = "google_oauth_credentials";
const STATES_TABLE = "google_oauth_states";
const ROW_ID = "primary";

// AAD: mengikat ciphertext ke tujuannya. Ciphertext refresh token tidak valid bila ditempel ke kolom code_verifier.
const AAD_REFRESH_TOKEN = `google-oauth:refresh-token:${ROW_ID}`;
const AAD_CODE_VERIFIER = "google-oauth:pkce-verifier";

const STATUS = Object.freeze({
  CONNECTED: "connected",
  REAUTH_REQUIRED: "reauth_required",
  DISCONNECTED: "disconnected",
});

const sha256Hex = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const dbFail = (context, error) => {
  // Hanya pesan/kode database; tidak ada data baris (bisa memuat ciphertext).
  console.error(`[OAUTH-STORE] ${context}: ${(error && error.code) || "-"} ${(error && error.message) || ""}`.trim());
  return new AppError("Terjadi kesalahan pada penyimpanan koneksi Google Drive", 500, "OAUTH_STORE_ERROR");
};

// Bentuk aman untuk dikirim ke lapisan lain / admin. Tidak ada token, tidak ada ciphertext.
const toPublic = (row) =>
  row
    ? {
        status: row.status,
        connectionId: row.connection_id,
        accountEmail: row.account_email || null,
        accountName: row.account_name || null,
        scope: row.scope || null,
        connectedAt: row.connected_at || null,
        lastRefreshAt: row.last_refresh_at || null,
        lastErrorCode: row.last_error_code || null,
        lastErrorAt: row.last_error_at || null,
      }
    : null;

const createGoogleOAuthStore = ({ supabase, crypto: tokenCrypto, now = () => Date.now() } = {}) => {
  if (!supabase || !tokenCrypto) throw new Error("createGoogleOAuthStore membutuhkan supabase dan crypto");
  const iso = (ms = now()) => new Date(ms).toISOString();

  // ---------- kredensial ----------
  // Baris mentah (termasuk ciphertext). Hanya dipakai di dalam service OAuth.
  const getRow = async () => {
    const { data, error } = await supabase.from(CREDENTIALS_TABLE).select("*").eq("id", ROW_ID).maybeSingle();
    if (error) throw dbFail("baca kredensial", error);
    return data || null;
  };

  const getPublic = async () => toPublic(await getRow());

  // Mendekripsi refresh token milik baris. Gagal (kunci diganti / data rusak) -> TokenCryptoError DECRYPT_FAILED.
  const decryptRefreshToken = (row) => tokenCrypto.decrypt(row.refresh_token_enc, AAD_REFRESH_TOKEN);

  // Menyimpan koneksi BARU. Dipanggil HANYA setelah akun terverifikasi (token valid + folder root dapat diakses),
  // sehingga kredensial lama tidak pernah dihapus sebelum yang baru terbukti bekerja.
  const saveConnection = async ({ refreshToken, scope, account, rootFolderId, adminId }) => {
    const payload = {
      status: STATUS.CONNECTED,
      connection_id: crypto.randomUUID(),
      account_permission_id: account.permissionId || null,
      account_email: account.email || null,
      account_name: account.name || null,
      refresh_token_enc: tokenCrypto.encrypt(refreshToken, AAD_REFRESH_TOKEN),
      scope: scope || null,
      root_folder_id: rootFolderId || null,
      connected_by: adminId || null,
      connected_at: iso(),
      last_refresh_at: iso(),
      last_error_code: null,
      last_error_at: null,
      disconnected_by: null,
      disconnected_at: null,
      updated_at: iso(),
    };
    const updated = await supabase.from(CREDENTIALS_TABLE).update(payload).eq("id", ROW_ID).select("connection_id");
    if (updated.error) throw dbFail("simpan koneksi (update)", updated.error);
    if (!updated.data || updated.data.length === 0) {
      const inserted = await supabase.from(CREDENTIALS_TABLE).insert({ id: ROW_ID, ...payload });
      if (inserted.error) {
        // Dua admin menghubungkan bersamaan: baris sudah dibuat pihak lain -> timpa lewat update.
        if (inserted.error.code !== "23505") throw dbFail("simpan koneksi (insert)", inserted.error);
        const retry = await supabase.from(CREDENTIALS_TABLE).update(payload).eq("id", ROW_ID);
        if (retry.error) throw dbFail("simpan koneksi (retry)", retry.error);
      }
    }
    return payload.connection_id;
  };

  // Menandai koneksi perlu otorisasi ulang. Compare-and-set pada connection_id: jika admin sempat menghubungkan
  // ulang saat refresh lama masih berjalan, penanda ini TIDAK menimpa koneksi baru. Mengembalikan true bila diterapkan.
  const markReauthRequired = async (connectionId, errorCode) => {
    const { data, error } = await supabase
      .from(CREDENTIALS_TABLE)
      .update({ status: STATUS.REAUTH_REQUIRED, last_error_code: String(errorCode || "invalid_grant").slice(0, 60), last_error_at: iso(), updated_at: iso() })
      .eq("id", ROW_ID)
      .eq("connection_id", connectionId)
      .eq("status", STATUS.CONNECTED)
      .select("connection_id");
    if (error) throw dbFail("tandai reauth_required", error);
    return Boolean(data && data.length);
  };

  const recordRefreshSuccess = async (connectionId, { newRefreshToken } = {}) => {
    const patch = { last_refresh_at: iso(), last_error_code: null, last_error_at: null, updated_at: iso() };
    // Google boleh merotasi refresh token; jika dikirim token baru, simpan (terenkripsi) menggantikan yang lama.
    if (newRefreshToken) patch.refresh_token_enc = tokenCrypto.encrypt(newRefreshToken, AAD_REFRESH_TOKEN);
    const { error } = await supabase.from(CREDENTIALS_TABLE).update(patch).eq("id", ROW_ID).eq("connection_id", connectionId);
    if (error) throw dbFail("catat refresh berhasil", error);
  };

  const recordTransientError = async (connectionId, errorCode) => {
    const { error } = await supabase
      .from(CREDENTIALS_TABLE)
      .update({ last_error_code: String(errorCode).slice(0, 60), last_error_at: iso(), updated_at: iso() })
      .eq("id", ROW_ID)
      .eq("connection_id", connectionId);
    if (error) throw dbFail("catat error sementara", error);
  };

  // Disconnect: menghapus kredensial OAuth (token, akun, scope). Hanya baris ini; metadata dokumen tidak disentuh.
  const clearConnection = async ({ adminId } = {}) => {
    const patch = {
      status: STATUS.DISCONNECTED,
      refresh_token_enc: null,
      account_permission_id: null,
      account_email: null,
      account_name: null,
      scope: null,
      root_folder_id: null,
      connected_by: null,
      connected_at: null,
      last_refresh_at: null,
      last_error_code: null,
      last_error_at: null,
      disconnected_by: adminId || null,
      disconnected_at: iso(),
      connection_id: crypto.randomUUID(),
      updated_at: iso(),
    };
    const { data, error } = await supabase.from(CREDENTIALS_TABLE).update(patch).eq("id", ROW_ID).select("connection_id");
    if (error) throw dbFail("hapus koneksi", error);
    return Boolean(data && data.length);
  };

  // ---------- state OAuth ----------
  const createState = async ({ state, codeVerifier, adminId, ttlSeconds }) => {
    // Pembersihan oportunistik state kedaluwarsa agar tabel tidak menumpuk.
    const purged = await supabase.from(STATES_TABLE).delete().lte("expires_at", iso());
    if (purged.error) console.error(`[OAUTH-STORE] bersihkan state kedaluwarsa: ${purged.error.code || "-"}`);
    const { error } = await supabase.from(STATES_TABLE).insert({
      state_hash: sha256Hex(state),
      code_verifier_enc: tokenCrypto.encrypt(codeVerifier, AAD_CODE_VERIFIER),
      admin_id: adminId,
      expires_at: iso(now() + ttlSeconds * 1000),
    });
    if (error) throw dbFail("buat state", error);
  };

  // Mengonsumsi state: DELETE ... RETURNING bersifat atomik, sehingga dua callback dengan state sama
  // tidak mungkin keduanya lolos (sekali pakai). Mengembalikan null bila tidak ada / sudah dipakai / kedaluwarsa.
  const consumeState = async (state) => {
    const { data, error } = await supabase.from(STATES_TABLE).delete().eq("state_hash", sha256Hex(state)).select("*").maybeSingle();
    if (error) throw dbFail("konsumsi state", error);
    if (!data) return { found: false };
    if (new Date(data.expires_at).getTime() <= now()) return { found: true, expired: true };
    let codeVerifier;
    try {
      codeVerifier = tokenCrypto.decrypt(data.code_verifier_enc, AAD_CODE_VERIFIER);
    } catch {
      return { found: true, unreadable: true };
    }
    return { found: true, expired: false, adminId: data.admin_id, codeVerifier };
  };

  // Membatalkan state tertentu tanpa memprosesnya (mis. pengguna menolak izin di layar Google).
  const discardState = async (state) => {
    const { error } = await supabase.from(STATES_TABLE).delete().eq("state_hash", sha256Hex(state));
    if (error) console.error(`[OAUTH-STORE] buang state: ${error.code || "-"}`);
  };

  return {
    STATUS,
    getRow,
    getPublic,
    decryptRefreshToken,
    saveConnection,
    markReauthRequired,
    recordRefreshSuccess,
    recordTransientError,
    clearConnection,
    createState,
    consumeState,
    discardState,
  };
};

module.exports = { createGoogleOAuthStore, toPublic, sha256Hex, STATUS, CREDENTIALS_TABLE, STATES_TABLE, ROW_ID };
