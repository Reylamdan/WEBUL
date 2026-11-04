const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("./AppError");

// Bucket PUBLIK untuk membaca/mengunduh. Upload, ganti, dan hapus hanya lewat backend (service role).
const BUCKET = "banpt-regulations";
const CACHE_CONTROL = "3600";

// Path selalu dibuat server (UUID acak); nama file dari pengguna tidak pernah dipakai sebagai path.
//   regulations/<id>/main/<uuid>.pdf        dokumen utama
//   regulations/<id>/attachments/<uuid>.pdf lampiran
const buildMainPath = (regulationId) => `regulations/${regulationId}/main/${crypto.randomUUID()}.pdf`;
const buildAttachmentPath = (regulationId) =>
  `regulations/${regulationId}/attachments/${crypto.randomUUID()}.pdf`;

// URL publik dibentuk dari helper Supabase (bukan string hardcode).
// downloadName (opsional) membuat link yang memaksa unduh dengan nama file tersebut.
const getPublicUrl = (filePath, downloadName) => {
  if (!filePath) return null;
  const options = downloadName ? { download: downloadName } : undefined;
  return supabase.storage.from(BUCKET).getPublicUrl(filePath, options).data.publicUrl;
};

const storageError = (context, error) => {
  console.error(
    `[STORAGE] ${context}: ${(error && error.message) || error} (kode: ${(error && error.code) || "-"})`
  );
  return new AppError("Terjadi kesalahan pada penyimpanan dokumen", 502, "STORAGE_ERROR");
};

const uploadPdf = async (filePath, buffer) => {
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: "application/pdf",
    cacheControl: CACHE_CONTROL,
    upsert: false,
  });
  if (error) throw storageError("peraturan BAN-PT: upload", error);
};

// Best-effort: kegagalan tidak mengubah respons sukses menjadi error.
// File yang tertinggal dicatat sebagai [ORPHAN] untuk dibersihkan manual.
const removeFilesQuietly = async (paths, context) => {
  const list = (paths || []).filter(Boolean);
  if (list.length === 0) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(list);
    if (error) throw error;
  } catch (error) {
    for (const p of list) {
      console.error(`[ORPHAN] ${BUCKET}/${p} (${context}): ${(error && error.message) || error}`);
    }
  }
};

module.exports = {
  BUCKET,
  buildMainPath,
  buildAttachmentPath,
  getPublicUrl,
  uploadPdf,
  removeFilesQuietly,
};
