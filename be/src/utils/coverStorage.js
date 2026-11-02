const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("./AppError");

const BUCKET = "news-images";
const CACHE_CONTROL = "31536000"; // satu tahun

// Path selalu dibuat server. Nama file dari pengguna tidak pernah dipakai.
const buildCoverPath = (newsId, extension) =>
  `covers/${newsId}/${crypto.randomUUID()}.${extension}`;

const getCoverPublicUrl = (coverPath) => {
  if (!coverPath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
};

const storageError = (context, error) => {
  console.error(
    `[STORAGE] ${context}: ${(error && error.message) || error} (kode: ${(error && error.code) || "-"})`
  );
  return new AppError("Terjadi kesalahan pada penyimpanan gambar", 502, "STORAGE_ERROR");
};

const uploadCoverObject = async (coverPath, buffer, contentType) => {
  const { error } = await supabase.storage.from(BUCKET).upload(coverPath, buffer, {
    contentType,
    cacheControl: CACHE_CONTROL,
    upsert: false,
  });

  if (error) throw storageError("cover: upload", error);
};

const removeCoverObject = async (coverPath) => {
  if (!coverPath) return;

  const { error } = await supabase.storage.from(BUCKET).remove([coverPath]);
  if (error) throw error;
};

const logOrphan = (coverPath, context, error) => {
  console.error(
    `[ORPHAN] ${coverPath} (${context}): ${(error && error.message) || error}`
  );
};

// Penghapusan file bersifat best-effort. Kegagalan tidak boleh mengubah respons
// sukses menjadi error; file yang tertinggal dicatat untuk pembersihan manual.
const removeCoverObjectQuietly = async (coverPath, context) => {
  if (!coverPath) return;

  try {
    await removeCoverObject(coverPath);
  } catch (error) {
    logOrphan(coverPath, context, error);
  }
};

module.exports = {
  BUCKET,
  CACHE_CONTROL,
  buildCoverPath,
  getCoverPublicUrl,
  uploadCoverObject,
  removeCoverObject,
  removeCoverObjectQuietly,
};
