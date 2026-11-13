// Lapisan penyimpanan dokumen di Google Drive, dipakai service akreditasi & regulasi BAN-PT.
// Cover berita TIDAK memakai modul ini (tetap Supabase Storage lewat utils/coverStorage.js).
//
// Prinsip yang sama dengan storage Supabase sebelumnya:
//   - Nama/lokasi file ditentukan server; nama dari pengguna hanya jadi nama tampilan.
//   - Urutan ganti file: unggah baru -> compare-and-set di database -> hapus file lama.
//   - Penghapusan file lama bersifat best-effort, tetapi KEGAGALANNYA dicatat ke antrean
//     drive_cleanup_queue (bukan hanya log) supaya file tidak menjadi yatim.
const drive = require("../services/googleDriveService");
const supabase = require("../config/supabase");
const AppError = require("./AppError");

// Folder per kategori di bawah GOOGLE_DRIVE_ROOT_FOLDER_ID (dibuat otomatis jika belum ada).
const CATEGORIES = {
  accreditationStudyProgram: { folderName: "akreditasi-program-studi" },
  banptRegulation: { folderName: "regulasi-banpt" },
};

const CLEANUP_TABLE = "drive_cleanup_queue";

const storageError = (context, error) => {
  console.error(
    `[STORAGE] ${context}: ${(error && error.message) || error} (status: ${(error && error.status) || "-"})`
  );
  if (error instanceof AppError) return error;
  return new AppError("Terjadi kesalahan pada penyimpanan dokumen", 502, "STORAGE_ERROR");
};

// Nama file di Drive: nama tampilan yang sudah disanitasi + penanda unik pendek agar mudah
// dikenali manusia di folder Drive. Penghubung sebenarnya adalah file ID di database.
const buildDriveName = (displayName, recordId) => {
  const short = String(recordId).slice(0, 8);
  return `${short}__${displayName}`.slice(0, 200);
};

// Unggah satu file. Mengembalikan metadata yang disimpan di database.
//   category : kunci CATEGORIES
//   recordId : UUID baris pemilik (ikut disimpan di appProperties untuk rekonsiliasi)
//   role     : "document" | "attachment"
//   processed: hasil validateDocument/validatePdf { buffer, mimeType, size, displayName }
const uploadDriveFile = async ({ category, recordId, role, attachmentId, processed }) => {
  const config = CATEGORIES[category];
  if (!config) throw new Error(`Kategori Drive tidak dikenal: ${category}`);
  try {
    const parentId = await drive.ensureFolder(config.folderName);
    const appProperties = { category, recordId, role };
    if (attachmentId) appProperties.attachmentId = attachmentId;
    const file = await drive.uploadFile({
      name: buildDriveName(processed.displayName, recordId),
      mimeType: processed.mimeType,
      buffer: processed.buffer,
      parentId,
      appProperties,
    });
    return {
      fileId: file.id,
      md5: file.md5Checksum || null,
      size: file.size !== undefined ? Number(file.size) : processed.size,
    };
  } catch (error) {
    throw storageError(`Drive upload (${category})`, error);
  }
};

const enqueueCleanup = async (fileId, context, error) => {
  const { error: dbError } = await supabase.from(CLEANUP_TABLE).insert({
    file_id: fileId,
    reason: String(context).slice(0, 200),
    last_error: String((error && error.message) || error).slice(0, 500),
  });
  // 23505 = file ini sudah ada di antrean (indeks unik pada file_id): tetap terjamin dibersihkan nanti.
  if (dbError && dbError.code !== "23505") throw dbError;
};

// Hapus (pindah ke sampah / hapus permanen sesuai GOOGLE_DRIVE_DELETE_MODE) file di Drive.
// Tidak pernah melempar error. Jika gagal: masuk antrean pembersihan; jika antrean juga gagal:
// log [ORPHAN] lengkap dengan file ID (rekonsiliasi akan menemukannya).
const removeDriveFilesQuietly = async (fileIds, context) => {
  for (const fileId of (fileIds || []).filter(Boolean)) {
    try {
      await drive.removeFile(fileId);
    } catch (error) {
      try {
        await enqueueCleanup(fileId, context, error);
        console.error(`[ORPHAN] drive:${fileId} (${context}) masuk antrean pembersihan: ${error.message}`);
      } catch (queueError) {
        console.error(
          `[ORPHAN] drive:${fileId} (${context}) gagal dihapus & gagal diantrekan: ${error.message} / ${queueError.message}`
        );
      }
    }
  }
};

module.exports = {
  CATEGORIES,
  CLEANUP_TABLE,
  buildDriveName,
  uploadDriveFile,
  removeDriveFilesQuietly,
  enqueueCleanup,
};
