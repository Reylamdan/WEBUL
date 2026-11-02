const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { validateAndReencode } = require("../utils/imageValidator");
const { buildCoverPath, uploadCoverObject, removeCoverObjectQuietly } = require("../utils/coverStorage");
const { serializeNews, DETAIL_COLUMNS } = require("./adminNewsController");

const newsNotFound = () => new AppError("Berita tidak ditemukan", 404, "NEWS_NOT_FOUND");
const coverNotFound = () => new AppError("Cover berita tidak ditemukan", 404, "COVER_NOT_FOUND");
const coverConflict = () => new AppError("Cover berita berubah, silakan coba lagi", 409, "COVER_CONFLICT");

const loadNewsForCover = async (req, res, next) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from("news")
    .select("id, cover_image_path")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError("news: ambil untuk cover", error);
  if (!data) throw newsNotFound();

  req.news = data;
  return next();
};

const putCover = async (req, res) => {
  const news = req.news;

  if (!req.file) {
    throw new AppError("File cover wajib diisi", 400, "FILE_REQUIRED");
  }

  // Validasi isi gambar (format, dimensi, megapixel, animasi) + re-encode tanpa metadata.
  const processed = await validateAndReencode(req.file);
  const newPath = buildCoverPath(news.id, processed.extension);
  const oldPath = news.cover_image_path;

  // Upload gambar baru terlebih dahulu.
  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  // Update database menggunakan compare-and-set berdasarkan path gambar sebelumnya.
  let query = supabase.from("news").update({ cover_image_path: newPath }).eq("id", news.id);

  if (oldPath === null || oldPath === undefined) {
    query = query.is("cover_image_path", null);
  } else {
    query = query.eq("cover_image_path", oldPath);
  }

  const { data: updated, error } = await query.select(DETAIL_COLUMNS).maybeSingle();

  if (error) {
    // Jika update database gagal, hapus gambar baru sebagai kompensasi.
    await removeCoverObjectQuietly(newPath, "putCover: kompensasi hapus cover baru setelah DB gagal");
    throwDbError("news: perbarui cover_image_path", error);
  }

  if (!updated) {
    // Perubahan bersamaan atau path tidak lagi sesuai.
    await removeCoverObjectQuietly(newPath, "putCover: kompensasi hapus cover baru karena CAS gagal");
    throw coverConflict();
  }

  // Jika berhasil, hapus gambar lama. Kegagalan hanya dicatat.
  if (oldPath) {
    await removeCoverObjectQuietly(oldPath, "putCover: hapus cover lama");
  }

  return res.json({
    success: true,
    message: "Cover berita berhasil diperbarui",
    data: { news: serializeNews(updated) },
  });
};

const deleteCover = async (req, res) => {
  const news = req.news;
  const oldPath = news.cover_image_path;

  if (!oldPath) {
    throw coverNotFound();
  }

  // Update database menjadi null terlebih dahulu menggunakan compare-and-set.
  const { data: updated, error } = await supabase
    .from("news")
    .update({ cover_image_path: null })
    .eq("id", news.id)
    .eq("cover_image_path", oldPath)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error) throwDbError("news: hapus cover_image_path", error);

  if (!updated) {
    // Cover bisa sudah dihapus atau diganti bersamaan.
    throw coverConflict();
  }

  // Setelah berhasil, hapus file dari Storage. Kegagalan dicatat sebagai [ORPHAN].
  await removeCoverObjectQuietly(oldPath, "deleteCover: hapus file cover");

  return res.json({
    success: true,
    message: "Cover berita berhasil dihapus",
    data: { news: serializeNews(updated) },
  });
};

module.exports = { loadNewsForCover, putCover, deleteCover };
