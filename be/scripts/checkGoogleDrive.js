// Diagnosa konfigurasi Google Drive. Menjalankan siklus nyata: cek akses folder root,
// buat folder kategori, unggah file kecil, unduh & bandingkan isinya, lalu hapus file uji.
//
//   npm run drive:check
//
// Memakai Drive ASLI sesuai .env. Hanya menyentuh satu file uji bertanda "drive-check" yang
// langsung dibersihkan. Tidak menyentuh database.
const env = require("../src/config/env");
const drive = require("../src/services/googleDriveService");
const { CATEGORIES } = require("../src/utils/driveStorage");

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

const hintFor = (error) => {
  if (error.reason === "storageQuotaExceeded") {
    return "Folder berada di My Drive. Service Account tidak punya kuota; pindahkan folder ke Shared Drive dan tambahkan Service Account sebagai Content manager.";
  }
  if (error.status === 404) {
    return "Folder tidak ditemukan atau belum dibagikan ke email Service Account (Content manager).";
  }
  if (error.status === 403) return "Service Account tidak punya izin cukup pada folder ini, atau Drive API belum diaktifkan di proyek Google Cloud.";
  if (error.status === 401) return "Kredensial tidak valid / sudah dicabut.";
  return "";
};

(async () => {
  console.log("Pemeriksaan Google Drive");
  if (!drive.isConfigured()) {
    console.log("  GAGAL Konfigurasi Google belum diisi di .env (lihat docs/GOOGLE_DRIVE_SETUP.md)");
    process.exit(1);
  }
  console.log(`  Mode hapus: ${env.googleDrive.deleteMode}`);

  let testFileId = null;
  try {
    const root = await step("Folder root dapat diakses", () => drive.getFileMetadata(env.googleDrive.rootFolderId));
    await step("Root adalah folder", async () => {
      if (root.mimeType !== "application/vnd.google-apps.folder") throw new Error("ID yang diisi bukan folder");
    });
    await step("Service Account boleh menambah file di root", async () => {
      if (root.capabilities && root.capabilities.canAddChildren === false) {
        throw new Error("Service Account hanya punya akses baca/komentar; berikan peran Content manager");
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
    await step("Hapus file uji", async () => { await drive.removeFile(testFileId); testFileId = null; });
    console.log(process.exitCode ? "\nAda yang gagal." : "\nSemua pemeriksaan lulus. Drive siap dipakai.");
  } catch {
    if (testFileId) { try { await drive.removeFile(testFileId); } catch { console.log(`  PERHATIAN file uji ${testFileId} perlu dihapus manual`); } }
  }
})();
