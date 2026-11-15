// Diagnosa LIVE Google Drive via OAuth 2.0. Memeriksa rantai yang sama dengan unggah dokumen, berurutan:
//   1. konfigurasi .env terbaca (OAuth aktif)            -> penyebab STORAGE_NOT_CONFIGURED
//   2. tabel OAuth/Drive ada di Supabase                 -> penyebab OAUTH_STORE_ERROR
//   3. akun Google sudah terhubung (bukan reauth)        -> GOOGLE_DRIVE_NOT_CONNECTED / GOOGLE_REAUTH_REQUIRED
//   4. refresh token terdekripsi & access token didapat  -> kunci enkripsi / OAuth Client salah
//   5. Drive: folder root, folder kategori, unggah, unduh, hapus file uji
//
//   npm run drive:check      (alias: npm run oauth:check)
//
// Memakai .env, Supabase, dan Drive ASLI. Hanya menyentuh satu file uji "drive-check.pdf" yang langsung dihapus.
// Skrip ini TIDAK pernah mencetak token, secret, kunci enkripsi, atau nilai variabel .env (hanya nama + ada/tidak).
const env = require("../src/config/env");
const supabase = require("../src/config/supabase");
const oauth = require("../src/services/googleOAuthService");
const drive = require("../src/services/googleDriveService");
const { CATEGORIES } = require("../src/utils/driveStorage");

const REQUIRED_VARS = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
  "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
];

const hintFor = (error) => {
  const code = error.code || "";
  if (code === "GOOGLE_DRIVE_NOT_CONNECTED") {
    return "Akun Google belum dihubungkan. Login sebagai admin, panggil POST /api/admin/google-drive/connect, buka authUrl di browser, setujui izin, lalu jalankan ulang skrip ini.";
  }
  if (code === "GOOGLE_REAUTH_REQUIRED") {
    return "Refresh token tidak berlaku lagi (dicabut, kedaluwarsa pada app berstatus Testing, atau kunci enkripsi berubah). Hubungkan ulang akun lewat POST /api/admin/google-drive/connect.";
  }
  if (code === "GOOGLE_OAUTH_CLIENT_INVALID") {
    return "Google menolak OAuth Client. Periksa GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET di .env dan di Google Cloud Console.";
  }
  if (code === "OAUTH_STORE_ERROR") {
    return "Tabel OAuth belum ada atau tidak dapat dibaca. Jalankan supabase/migrations/20261115_google_drive_oauth.sql di Supabase SQL Editor.";
  }
  if (error.status === 404) return "Folder tidak ditemukan atau tidak dapat dibuka oleh akun Google yang terhubung. Periksa GOOGLE_DRIVE_ROOT_FOLDER_ID.";
  if (error.status === 403) return "Izin tidak cukup pada folder ini, atau Google Drive API belum diaktifkan di proyek Google Cloud.";
  if (error.status === 401) return "Access token ditolak Google. Hubungkan ulang akun.";
  return "";
};

const step = async (label, fn) => {
  try {
    const result = await fn();
    console.log(`  OK    ${label}`);
    return result;
  } catch (error) {
    console.log(`  GAGAL ${label}\n        ${error.message}`);
    const hint = hintFor(error);
    if (hint) console.log(`        Saran: ${hint}`);
    process.exitCode = 1;
    throw error;
  }
};

const missingTable = (error) =>
  error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message || ""));

const checkTable = async (table) => {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
  if (error) {
    const err = new Error(
      missingTable(error)
        ? `Tabel ${table} tidak ditemukan di Supabase`
        : `Tabel ${table} tidak dapat dibaca (${error.code || "-"})`
    );
    err.code = "OAUTH_STORE_ERROR";
    throw err;
  }
};

(async () => {
  console.log("Pemeriksaan Google Drive (OAuth 2.0)");

  // 1. Konfigurasi
  if (!env.googleOAuth.enabled) {
    const names = new Set(Object.keys(process.env).filter((k) => process.env[k]));
    console.log("  GAGAL Google Drive OAuth NONAKTIF: unggah dokumen akan 503 STORAGE_NOT_CONFIGURED");
    for (const name of REQUIRED_VARS) console.log(`        ${names.has(name) ? "terbaca " : "KOSONG  "} ${name}`);
    console.log(
      "        Saran: isi variabel yang KOSONG di .env (lihat .env.example), jalankan skrip ini dari folder be, " +
        "dan MULAI ULANG server setelah .env diubah."
    );
    process.exit(1);
  }
  console.log("  OK    Konfigurasi OAuth terbaca dan valid");
  console.log(`        Mode hapus: ${env.googleDrive.deleteMode}`);

  let testFileId = null;
  try {
    // 2. Tabel
    for (const table of ["google_oauth_credentials", "google_oauth_states", "drive_cleanup_queue"]) {
      await step(`Tabel ${table} ada`, () => checkTable(table));
    }

    // 3. Koneksi
    const status = await step("Status koneksi akun Google", async () => {
      const s = await oauth.getStatus();
      if (s.connection.status === "disconnected") {
        const e = new Error("Akun Google belum terhubung");
        e.code = "GOOGLE_DRIVE_NOT_CONNECTED";
        throw e;
      }
      if (s.connection.status === "reauth_required") {
        const e = new Error(`Perlu hubungkan ulang (kode terakhir: ${s.connection.lastErrorCode || "-"})`);
        e.code = "GOOGLE_REAUTH_REQUIRED";
        throw e;
      }
      return s;
    });
    console.log(`        Akun terhubung: ${status.connection.accountEmail || "(email tidak tersedia)"}`);

    // 4. Access token (nilainya TIDAK dicetak)
    await step("Access token OAuth diperoleh (token tidak ditampilkan)", async () => {
      const token = await oauth.getAccessToken();
      if (typeof token !== "string" || token.length < 20) throw new Error("Access token kosong atau tidak valid");
    });

    // 5. Drive
    const root = await step("Folder root dapat diakses", () => drive.getFileMetadata(env.googleDrive.rootFolderId));
    await step("Root adalah folder", async () => {
      if (root.mimeType !== "application/vnd.google-apps.folder") throw new Error("ID yang diisi bukan folder");
    });
    await step("Akun boleh menambah file di root", async () => {
      if (root.capabilities && root.capabilities.canAddChildren === false) {
        throw new Error("Akun yang terhubung hanya punya akses baca/komentar pada folder root");
      }
    });
    const folderId = await step("Folder kategori tersedia/dapat dibuat", async () => {
      let id;
      for (const c of Object.values(CATEGORIES)) id = await drive.ensureFolder(c.folderName);
      return id;
    });

    const body = Buffer.from(`%PDF-1.4\ndrive-check ${new Date().toISOString()}\n%%EOF`);
    const uploaded = await step("Unggah file uji", () =>
      drive.uploadFile({ name: "drive-check.pdf", mimeType: "application/pdf", buffer: body, parentId: folderId, appProperties: { role: "drive-check" } })
    );
    testFileId = uploaded.id;
    await step("Unduh file uji & isi sama persis", async () => {
      const res = await drive.downloadFile(testFileId);
      const got = Buffer.from(await res.arrayBuffer());
      if (!got.equals(body)) throw new Error("Isi file hasil unduh berbeda");
    });
    await step("Hapus file uji", async () => {
      await drive.removeFile(testFileId);
      testFileId = null;
    });
    console.log(process.exitCode ? "\nAda yang gagal." : "\nSemua pemeriksaan lulus. Drive siap dipakai untuk unggah dokumen.");
  } catch {
    if (testFileId) {
      try {
        await drive.removeFile(testFileId);
      } catch {
        console.log(`  PERHATIAN file uji ${testFileId} perlu dihapus manual`);
      }
    }
  }
})();
