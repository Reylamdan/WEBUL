// OAuth 2.0 (Authorization Code + PKCE S256) untuk menghubungkan Google Drive ke backend.
//
// Alur singkat:
//   1. Admin memanggil POST /api/admin/google-drive/connect -> backend membuat state acak sekali pakai +
//      code_verifier PKCE, menyimpannya (hash/terenkripsi) di Supabase, lalu mengembalikan authUrl Google.
//   2. Browser admin menyetujui di Google -> Google mengarahkan ke GET /api/admin/google-drive/callback.
//   3. Backend mengonsumsi state (sekali pakai, ada masa berlaku), menukar code (dengan code_verifier),
//      MEMVERIFIKASI akun + akses folder root, dan baru SETELAH itu menyimpan refresh token terenkripsi.
//   4. Setiap panggilan Drive memakai access token dari getAccessToken(): disimpan di MEMORI saja, di-refresh
//      otomatis. invalid_grant (mis. token aplikasi berstatus Testing kedaluwarsa ~7 hari, atau akses dicabut)
//      -> status "reauth_required"; admin harus menghubungkan ulang.
//
// Yang TIDAK pernah dilakukan modul ini: mengirim access/refresh token ke frontend, mencatat token ke log,
// atau menerima URL redirect dari request.
const crypto = require("node:crypto");
const AppError = require("../utils/AppError");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const HTTP_TIMEOUT_MS = 15_000;
const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_RETRY_BASE_MS = 500;
const EXPIRY_SKEW_MS = 60_000; // access token dianggap kedaluwarsa 60 dtk lebih awal
const DEFAULT_STATUS_CACHE_MS = 15_000;
const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const b64url = (buffer) => buffer.toString("base64url");
const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kegagalan alur callback. `code` dari daftar tertutup; `message` aman ditampilkan ke admin.
const FLOW_MESSAGES = Object.freeze({
  ACCESS_DENIED: "Izin ditolak di halaman Google. Koneksi tidak diubah.",
  STATE_INVALID: "Permintaan koneksi tidak dikenali atau sudah pernah dipakai. Mulai lagi dari tombol Hubungkan.",
  STATE_EXPIRED: "Permintaan koneksi sudah kedaluwarsa. Mulai lagi dari tombol Hubungkan.",
  ADMIN_INACTIVE: "Akun admin yang memulai koneksi tidak lagi aktif.",
  CODE_INVALID: "Kode otorisasi Google tidak valid atau sudah kedaluwarsa. Mulai lagi dari tombol Hubungkan.",
  CLIENT_INVALID: "Konfigurasi OAuth Client di backend ditolak Google. Periksa GOOGLE_OAUTH_CLIENT_ID/SECRET dan redirect URI.",
  NO_REFRESH_TOKEN:
    "Google tidak memberikan refresh token. Cabut akses aplikasi di myaccount.google.com/permissions lalu hubungkan lagi.",
  SCOPE_MISSING: "Izin akses Google Drive tidak diberikan penuh. Hubungkan lagi dan setujui semua izin.",
  DRIVE_ACCESS_DENIED: "Akun Google ini tidak dapat memakai Drive API. Pastikan Google Drive API aktif di proyek Google Cloud.",
  ROOT_FOLDER_INACCESSIBLE:
    "Akun Google ini tidak dapat membuka folder root (GOOGLE_DRIVE_ROOT_FOLDER_ID). Pastikan folder dimiliki/dibagikan ke akun ini. Koneksi lama tidak diubah.",
  ROOT_FOLDER_INVALID: "GOOGLE_DRIVE_ROOT_FOLDER_ID bukan folder. Koneksi lama tidak diubah.",
  ROOT_FOLDER_READONLY: "Akun Google ini hanya punya akses baca pada folder root; butuh izin menambah file. Koneksi lama tidak diubah.",
  GOOGLE_UNAVAILABLE: "Google tidak dapat dihubungi saat ini. Coba lagi beberapa saat lagi. Koneksi lama tidak diubah.",
  INTERNAL: "Terjadi kesalahan saat menyimpan koneksi. Koneksi lama tidak diubah.",
});

class OAuthFlowError extends Error {
  constructor(code) {
    super(FLOW_MESSAGES[code] || FLOW_MESSAGES.INTERNAL);
    this.name = "OAuthFlowError";
    this.code = FLOW_MESSAGES[code] ? code : "INTERNAL";
  }
}

const reauthError = () =>
  new AppError("Koneksi Google Drive perlu dihubungkan ulang oleh admin", 503, "GOOGLE_REAUTH_REQUIRED");
const notConnectedError = () =>
  new AppError("Google Drive belum dihubungkan oleh admin", 503, "GOOGLE_DRIVE_NOT_CONNECTED");
const notEnabledError = () =>
  new AppError("Mode OAuth Google Drive tidak aktif pada konfigurasi server", 409, "OAUTH_NOT_ENABLED");

// Log aman: hanya konteks + kode. Tidak pernah memuat body respons, parameter, atau token.
const logSafe = (context, reason) => console.error(`[OAUTH] ${context}: ${reason}`);

const createGoogleOAuthService = ({
  config,
  store,
  fetchImpl,
  isAdminActive,
  now = () => Date.now(),
  randomBytes = (n) => crypto.randomBytes(n),
  sleep = sleepMs,
  retryBaseMs = REFRESH_RETRY_BASE_MS,
  statusCacheMs = DEFAULT_STATUS_CACHE_MS,
} = {}) => {
  const cfg = config || {};
  const doFetch = (...args) => (fetchImpl || globalThis.fetch)(...args);
  const enabled = () => Boolean(cfg.enabled);
  const requireEnabled = () => {
    if (!enabled() || !store) throw notEnabledError();
  };

  // ---------- cache di memori (BUKAN di database) ----------
  let accessMemo = null; // { token, connectionId, expiresAt }
  let statusCache = null; // { at, row }
  let inflight = null; // { connectionId, promise }
  const listeners = [];

  const invalidateAll = () => {
    accessMemo = null;
    statusCache = null;
    inflight = null;
  };
  // Dipanggil saat akun berganti atau koneksi diputus: pemilik cache (mis. cache folder Drive) mereset diri.
  const onConnectionChange = (listener) => {
    listeners.push(listener);
  };
  const emitChange = (reason) => {
    for (const listener of listeners) {
      try {
        listener(reason);
      } catch (error) {
        logSafe("listener perubahan koneksi", (error && error.name) || "error");
      }
    }
  };

  const loadRow = async ({ force = false } = {}) => {
    if (!force && statusCache && now() - statusCache.at < statusCacheMs) return statusCache.row;
    const row = await store.getRow();
    statusCache = { at: now(), row };
    return row;
  };

  const assertUsable = (row) => {
    if (!row || row.status === "disconnected") throw notConnectedError();
    if (row.status === "reauth_required") throw reauthError();
  };

  // ---------- HTTP ke Google ----------
  const request = async (url, init, timeoutMs = HTTP_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
    try {
      const response = await doFetch(url, { ...init, signal: controller.signal });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null; // bukan JSON / kosong
      }
      return { ok: response.ok, status: response.status, body };
    } catch {
      return { ok: false, status: 0, body: null, network: true };
    } finally {
      clearTimeout(timer);
    }
  };

  const postForm = (url, params) =>
    request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
    });

  const getJson = (url, accessToken) =>
    request(url, { method: "GET", headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });

  const googleErrorCode = (res) => (res.body && typeof res.body.error === "string" ? res.body.error : "");
  const isTransient = (res) => res.network || res.status === 429 || res.status >= 500;

  // ---------- 1. Memulai koneksi ----------
  const startConnect = async ({ adminId }) => {
    requireEnabled();
    const state = b64url(randomBytes(32));
    const codeVerifier = b64url(randomBytes(32)); // 43 karakter (RFC 7636: 43-128)
    const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
    await store.createState({ state, codeVerifier, adminId, ttlSeconds: cfg.stateTtlSeconds || 600 });

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline", // meminta refresh token
      prompt: "consent select_account", // selalu dapat refresh token baru + bisa memilih/mengganti akun
    });
    return { authUrl: `${AUTH_URL}?${params.toString()}`, expiresInSeconds: cfg.stateTtlSeconds || 600 };
  };

  // ---------- 2. Callback ----------
  const verifyAccount = async (accessToken) => {
    const res = await getJson(`${DRIVE_API}/about?fields=user(displayName,emailAddress,permissionId)`, accessToken);
    if (res.status === 401 || res.status === 403) throw new OAuthFlowError("DRIVE_ACCESS_DENIED");
    if (!res.ok || !res.body || !res.body.user) throw new OAuthFlowError("GOOGLE_UNAVAILABLE");
    const user = res.body.user;
    return { email: user.emailAddress || null, name: user.displayName || null, permissionId: user.permissionId || null };
  };

  const verifyRootFolder = async (accessToken) => {
    const url = `${DRIVE_API}/files/${encodeURIComponent(cfg.rootFolderId)}?supportsAllDrives=true&fields=id,mimeType,capabilities(canAddChildren)`;
    const res = await getJson(url, accessToken);
    if (res.status === 404 || res.status === 403 || res.status === 401) throw new OAuthFlowError("ROOT_FOLDER_INACCESSIBLE");
    if (!res.ok || !res.body) throw new OAuthFlowError("GOOGLE_UNAVAILABLE");
    if (res.body.mimeType !== FOLDER_MIME) throw new OAuthFlowError("ROOT_FOLDER_INVALID");
    if (res.body.capabilities && res.body.capabilities.canAddChildren === false) throw new OAuthFlowError("ROOT_FOLDER_READONLY");
  };

  // Mengembalikan { account, accountChanged }; melempar OAuthFlowError (kode tertutup) untuk setiap kegagalan.
  // Kredensial lama BARU diganti pada langkah terakhir, setelah semua verifikasi lolos.
  const handleCallback = async ({ code, state, error }) => {
    requireEnabled();

    const stateOk = typeof state === "string" && STATE_PATTERN.test(state);
    if (error) {
      // Pengguna menolak / Google mengembalikan error: buang state bila ada, tanpa mengubah koneksi.
      if (stateOk) await store.discardState(state);
      throw new OAuthFlowError("ACCESS_DENIED");
    }
    if (!stateOk || typeof code !== "string" || code.length === 0 || code.length > 2048) {
      if (stateOk) await store.discardState(state);
      throw new OAuthFlowError("STATE_INVALID");
    }

    const consumed = await store.consumeState(state); // atomik: sekali pakai
    if (!consumed.found || consumed.unreadable) throw new OAuthFlowError("STATE_INVALID");
    if (consumed.expired) throw new OAuthFlowError("STATE_EXPIRED");

    if (isAdminActive && !(await isAdminActive(consumed.adminId))) throw new OAuthFlowError("ADMIN_INACTIVE");

    // Pertukaran code TIDAK diulang saat gagal: code bersifat sekali pakai di sisi Google.
    const exchange = await postForm(TOKEN_URL, {
      grant_type: "authorization_code",
      code,
      code_verifier: consumed.codeVerifier,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    });
    if (!exchange.ok) {
      const googleCode = googleErrorCode(exchange);
      logSafe("tukar authorization code", googleCode || `http_${exchange.status}`);
      if (googleCode === "invalid_grant") throw new OAuthFlowError("CODE_INVALID");
      if (googleCode === "invalid_client" || googleCode === "unauthorized_client") throw new OAuthFlowError("CLIENT_INVALID");
      throw new OAuthFlowError("GOOGLE_UNAVAILABLE");
    }
    const tokens = exchange.body || {};
    if (typeof tokens.access_token !== "string" || !tokens.access_token) throw new OAuthFlowError("GOOGLE_UNAVAILABLE");
    if (typeof tokens.refresh_token !== "string" || !tokens.refresh_token) throw new OAuthFlowError("NO_REFRESH_TOKEN");
    const grantedScopes = String(tokens.scope || "").split(/\s+/);
    if (!grantedScopes.includes(SCOPE)) throw new OAuthFlowError("SCOPE_MISSING");

    // Verifikasi dengan token BARU sebelum menyentuh kredensial lama.
    const account = await verifyAccount(tokens.access_token);
    await verifyRootFolder(tokens.access_token);

    let previous = null;
    try {
      previous = await store.getRow();
    } catch {
      previous = null;
    }
    // Token milik akun LAMA dibaca sekarang (sebelum baris diganti) agar bisa dicabut bila akun berganti.
    let previousToken = null;
    if (previous && previous.status !== "disconnected" && previous.refresh_token_enc) {
      try {
        previousToken = store.decryptRefreshToken(previous);
      } catch {
        previousToken = null;
      }
    }
    const previousKey = previous && previous.status !== "disconnected" ? previous.account_permission_id || previous.account_email : null;
    const newKey = account.permissionId || account.email;
    const accountChanged = Boolean(previousKey && newKey && previousKey !== newKey);

    let connectionId;
    try {
      connectionId = await store.saveConnection({
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        account,
        rootFolderId: cfg.rootFolderId,
        adminId: consumed.adminId,
      });
    } catch (saveError) {
      logSafe("simpan koneksi", (saveError && saveError.code) || "error");
      throw new OAuthFlowError("INTERNAL");
    }

    // Koneksi baru aktif: buang cache lama, simpan access token yang sudah ada agar tidak langsung refresh.
    invalidateAll();
    const expiresInMs = (Number(tokens.expires_in) > 0 ? Number(tokens.expires_in) : 3600) * 1000;
    accessMemo = { token: tokens.access_token, connectionId, expiresAt: now() + expiresInMs };
    emitChange(accountChanged ? "account_changed" : "connected");

    // Akun BERGANTI: cabut (best-effort) refresh token akun lama supaya izin aplikasi tidak menggantung di akun itu.
    // Hanya saat akunnya berbeda: pada akun yang sama pencabutan token lama dapat membatalkan otorisasi yang baru.
    // Tidak menghapus file/metadata apa pun.
    if (accountChanged && previousToken && previousToken !== tokens.refresh_token) {
      const revokedOld = await postForm(REVOKE_URL, { token: previousToken });
      if (!(revokedOld.ok || googleErrorCode(revokedOld) === "invalid_token")) logSafe("cabut token akun lama", googleErrorCode(revokedOld) || "gagal");
    }

    return { account: { email: account.email, name: account.name }, accountChanged };
  };

  // ---------- 3. Access token untuk panggilan Drive ----------
  const refreshAccessToken = async (connectionId, retriedAfterRace = false) => {
    const row = await loadRow({ force: true });
    assertUsable(row);
    if (row.connection_id !== connectionId && !retriedAfterRace) {
      // Koneksi berganti saat menunggu: lanjutkan dengan koneksi terbaru.
      return refreshAccessToken(row.connection_id, true);
    }

    let refreshToken;
    try {
      refreshToken = store.decryptRefreshToken(row);
    } catch {
      // Kunci enkripsi diganti / data rusak: token tidak terbaca -> perlu hubungkan ulang.
      logSafe("dekripsi refresh token", "DECRYPT_FAILED");
      await store.markReauthRequired(row.connection_id, "DECRYPT_FAILED").catch(() => {});
      invalidateAll();
      throw reauthError();
    }

    let last = null;
    for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt += 1) {
      last = await postForm(TOKEN_URL, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      });

      if (last.ok && last.body && typeof last.body.access_token === "string" && last.body.access_token) {
        const expiresInMs = (Number(last.body.expires_in) > 0 ? Number(last.body.expires_in) : 3600) * 1000;
        accessMemo = { token: last.body.access_token, connectionId: row.connection_id, expiresAt: now() + expiresInMs };
        try {
          await store.recordRefreshSuccess(row.connection_id, {
            newRefreshToken: typeof last.body.refresh_token === "string" ? last.body.refresh_token : undefined,
          });
        } catch {
          /* pencatatan gagal tidak boleh menggagalkan unggah/unduh */
        }
        return accessMemo.token;
      }

      const googleCode = googleErrorCode(last);
      if (googleCode === "invalid_grant") {
        // Refresh token kedaluwarsa (Testing ~7 hari) / dicabut / akun dihapus / password berubah.
        logSafe("refresh token", "invalid_grant");
        const applied = await store.markReauthRequired(row.connection_id, "invalid_grant").catch(() => false);
        invalidateAll();
        if (!applied && !retriedAfterRace) {
          // Koneksi sudah diganti pihak lain selama refresh berjalan: pakai koneksi baru, jangan gagalkan.
          const fresh = await loadRow({ force: true });
          if (fresh && fresh.status === "connected" && fresh.connection_id !== row.connection_id) {
            return refreshAccessToken(fresh.connection_id, true);
          }
        }
        throw reauthError();
      }
      if (googleCode === "invalid_client" || googleCode === "unauthorized_client") {
        // Salah konfigurasi server, bukan salah koneksi: status TIDAK diubah (menghubungkan ulang tidak membantu).
        logSafe("refresh token", googleCode);
        throw new AppError("Konfigurasi OAuth Google di server tidak valid", 503, "GOOGLE_OAUTH_CLIENT_INVALID");
      }
      if (!isTransient(last)) {
        logSafe("refresh token", googleCode || `http_${last.status}`);
        throw new AppError("Gagal memperbarui akses Google Drive", 502, "GOOGLE_AUTH_ERROR");
      }
      if (attempt < REFRESH_MAX_ATTEMPTS) await sleep(retryBaseMs * 2 ** (attempt - 1));
    }

    logSafe("refresh token", last && last.network ? "network" : `http_${last && last.status}`);
    await store.recordTransientError(row.connection_id, last && last.network ? "network" : `http_${last && last.status}`).catch(() => {});
    throw new AppError("Google tidak dapat dihubungi untuk memperbarui akses Drive", 502, "GOOGLE_AUTH_UNAVAILABLE");
  };

  // Dipakai googleDriveService sebagai penyedia token. Aman dipanggil paralel (satu refresh bersama).
  const getAccessToken = async () => {
    if (!enabled() || !store) throw new AppError("Penyimpanan dokumen belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");
    const row = await loadRow();
    assertUsable(row);
    if (accessMemo && accessMemo.connectionId === row.connection_id && accessMemo.expiresAt - EXPIRY_SKEW_MS > now()) {
      return accessMemo.token;
    }
    if (!inflight || inflight.connectionId !== row.connection_id) {
      const promise = refreshAccessToken(row.connection_id).finally(() => {
        if (inflight && inflight.promise === promise) inflight = null;
      });
      inflight = { connectionId: row.connection_id, promise };
    }
    return inflight.promise;
  };

  // Dipakai saat Drive menjawab 401 padahal token belum "kedaluwarsa" (dicabut lebih awal): paksa refresh.
  const invalidateAccessToken = async () => {
    accessMemo = null;
  };

  // Kunci cache folder Drive: berubah setiap koneksi baru / akun berganti / disconnect.
  const getAuthScope = async () => {
    if (!enabled() || !store) return "oauth:off";
    try {
      const row = await loadRow();
      return `oauth:${(row && row.status !== "disconnected" && row.connection_id) || "none"}`;
    } catch {
      return "oauth:unknown";
    }
  };

  // ---------- 4. Status & disconnect ----------
  const getStatus = async () => {
    if (!enabled() || !store) return { authMode: "oauth", configured: false, connection: { status: "disconnected" } };
    const row = await loadRow({ force: true });
    const connection = row
      ? {
          status: row.status,
          accountEmail: row.account_email || null,
          accountName: row.account_name || null,
          connectedAt: row.connected_at || null,
          lastRefreshAt: row.last_refresh_at || null,
          lastErrorCode: row.last_error_code || null,
          lastErrorAt: row.last_error_at || null,
        }
      : { status: "disconnected" };
    return { authMode: "oauth", configured: true, connection };
  };

  // Mencabut token di Google (best-effort) lalu MENGHAPUS kredensial OAuth. Tidak menyentuh metadata dokumen.
  const disconnect = async ({ adminId } = {}) => {
    requireEnabled();
    const row = await store.getRow();
    if (!row || row.status === "disconnected") return { alreadyDisconnected: true, revoked: false };

    let revoked = false;
    if (row.refresh_token_enc) {
      let token = null;
      try {
        token = store.decryptRefreshToken(row);
      } catch {
        token = null;
      }
      if (token) {
        const res = await postForm(REVOKE_URL, { token });
        // invalid_token = sudah tidak berlaku di Google (mis. reauth_required): hasil akhirnya sama dengan tercabut.
        revoked = res.ok || googleErrorCode(res) === "invalid_token";
        if (!revoked) logSafe("cabut token di Google", googleErrorCode(res) || (res.network ? "network" : `http_${res.status}`));
      }
    }

    await store.clearConnection({ adminId });
    invalidateAll();
    emitChange("disconnected");
    return { alreadyDisconnected: false, revoked };
  };

  return {
    isEnabled: enabled,
    startConnect,
    handleCallback,
    getAccessToken,
    invalidateAccessToken,
    getAuthScope,
    getStatus,
    disconnect,
    onConnectionChange,
    // untuk pengujian / pemeliharaan
    _invalidateAll: invalidateAll,
  };
};

// ---------- Singleton bawaan (dibuat malas) ----------
let instance = null;
const defaultInstance = () => {
  if (!instance) {
    const env = require("../config/env");
    const cfg = env.googleOAuth;
    let store = null;
    let isAdminActive;
    if (cfg.enabled) {
      const supabase = require("../config/supabase");
      const { createTokenCrypto } = require("../utils/tokenCrypto");
      const { createGoogleOAuthStore } = require("./googleOAuthStore");
      store = createGoogleOAuthStore({ supabase, crypto: createTokenCrypto(cfg.encryptionKey) });
      isAdminActive = async (adminId) => {
        const { data, error } = await supabase.from("admins").select("id, is_active").eq("id", adminId).maybeSingle();
        return !error && Boolean(data && data.is_active);
      };
    }
    instance = createGoogleOAuthService({ config: cfg, store, isAdminActive });
  }
  return instance;
};
const lazy = (name) => (...args) => defaultInstance()[name](...args);

module.exports = {
  createGoogleOAuthService,
  OAuthFlowError,
  FLOW_MESSAGES,
  SCOPE,
  AUTH_URL,
  TOKEN_URL,
  REVOKE_URL,
  defaultInstance,
  isEnabled: lazy("isEnabled"),
  startConnect: lazy("startConnect"),
  handleCallback: lazy("handleCallback"),
  getAccessToken: lazy("getAccessToken"),
  invalidateAccessToken: lazy("invalidateAccessToken"),
  getAuthScope: lazy("getAuthScope"),
  getStatus: lazy("getStatus"),
  disconnect: lazy("disconnect"),
  onConnectionChange: lazy("onConnectionChange"),
};
