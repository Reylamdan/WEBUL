const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { validateVideo } = require("../utils/videoValidator");
const env = require("../config/env");
const cloudinaryConfig = require("../config/cloudinary");
const {
  MEDIA_TABLE,
  uploadVideoObject,
  removeVideoQuietly,
  removeNewVideoQuietly,
} = require("../services/videoStorageService");

const videoNotFound = () => new AppError("Video tidak ditemukan", 404, "VIDEO_NOT_FOUND");
const videoConflict = () =>
  new AppError("Kondisi video telah berubah, silakan coba lagi", 409, "VIDEO_CONFLICT");
const recordNotFound = (moduleName) =>
  new AppError(`Data induk pada modul ${moduleName} tidak ditemukan`, 404, "RECORD_NOT_FOUND");

// Pemetaan modul ke tabel database induk
const MODULE_TABLES = {
  news: "news",
  announcements: "announcements",
};

// Memverifikasi apakah data induk benar-benar ada di tabel modulnya
const verifyRecordExists = async (moduleName, recordId) => {
  const table = MODULE_TABLES[moduleName];
  // Fail closed: modul tanpa tabel induk tidak boleh menerima video (ID sembarang tidak boleh lolos).
  if (!table) throw new AppError("Modul belum mendukung video", 400, "VALIDATION_ERROR");

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", recordId)
    .maybeSingle();

  if (error) throwDbError(`verifikasi record induk ${moduleName}`, error);
  if (!data) throw recordNotFound(moduleName);
};

// Serialisasi baris tabel media_videos (snake_case) ke format API (camelCase)
const serializeVideo = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    module: row.owner_module,
    recordId: row.record_id,
    publicId: row.public_id,
    secureUrl: row.secure_url,
    thumbnailUrl: row.thumbnail_url,
    resourceType: row.resource_type || "video",
    format: row.format,
    bytes: row.bytes,
    duration: row.duration,
    width: row.width,
    height: row.height,
    status: row.status,
    uploadedBy: row.uploaded_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Mengambil video aktif berdasarkan modul dan recordId
const getVideo = async (req, res) => {
  const { module, recordId } = req.validated.params;

  const { data, error } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("owner_module", module)
    .eq("record_id", recordId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throwDbError("media_videos: ambil video", error);

  return res.json({
    success: true,
    data: { video: serializeVideo(data) },
  });
};

// Mengambil video berdasarkan media ID langsung
const getVideoById = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError("media_videos: ambil video by id", error);
  if (!data) throw videoNotFound();

  return res.json({
    success: true,
    data: { video: serializeVideo(data) },
  });
};

// Upload video baru untuk konten
const uploadVideo = async (req, res) => {
  const { module, recordId } = req.validated.params;

  if (!cloudinaryConfig.isConfigured()) throw cloudinaryConfig.notConfigured();

  if (!req.file) {
    throw new AppError("File video wajib diisi", 400, "FILE_REQUIRED");
  }

  // Verifikasi keberadaan konten induk
  await verifyRecordExists(module, recordId);

  // Periksa apakah sudah ada video aktif (jika ada, arahkan menggunakan PUT untuk penggantian)
  const { data: existing, error: checkError } = await supabase
    .from(MEDIA_TABLE)
    .select("id, public_id")
    .eq("owner_module", module)
    .eq("record_id", recordId)
    .eq("status", "active")
    .maybeSingle();

  if (checkError) throwDbError("media_videos: cek video aktif", checkError);
  if (existing) {
    throw new AppError(
      "Konten ini sudah memiliki video aktif. Gunakan endpoint PUT untuk menggantinya",
      409,
      "VIDEO_ALREADY_EXISTS"
    );
  }

  // Validasi isi buffer video (magic bytes, ekstensi, MIME, ukuran)
  const maxBytes = env.cloudinaryVideo?.maxBytes;
  const processed = validateVideo(req.file, maxBytes);

  // Unggah ke Cloudinary
  const uploaded = await uploadVideoObject(module, recordId, processed.buffer);

  // Simpan metadata ke tabel media_videos
  const payload = {
    owner_module: module,
    record_id: recordId,
    public_id: uploaded.publicId,
    secure_url: uploaded.url,
    thumbnail_url: uploaded.thumbnailUrl,
    resource_type: "video",
    format: uploaded.format,
    bytes: uploaded.bytes,
    duration: uploaded.duration,
    width: uploaded.width,
    height: uploaded.height,
    status: "active",
    uploaded_by: req.admin?.id || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from(MEDIA_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (insertError) {
    // Kompensasi penghapusan aset di Cloudinary jika penyimpanan DB gagal
    await removeNewVideoQuietly(uploaded.publicId, "uploadVideo: DB insert gagal");
    throwDbError("media_videos: simpan video", insertError);
  }

  return res.status(201).json({
    success: true,
    message: "Video berhasil diunggah",
    data: { video: serializeVideo(inserted) },
  });
};

// Mengganti video lama dengan video baru (pola Compare-and-Set)
const replaceVideo = async (req, res) => {
  const { module, recordId } = req.validated.params;

  if (!cloudinaryConfig.isConfigured()) throw cloudinaryConfig.notConfigured();

  if (!req.file) {
    throw new AppError("File video wajib diisi", 400, "FILE_REQUIRED");
  }

  await verifyRecordExists(module, recordId);

  // Ambil video aktif saat ini
  const { data: current, error: getError } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("owner_module", module)
    .eq("record_id", recordId)
    .eq("status", "active")
    .maybeSingle();

  if (getError) throwDbError("media_videos: ambil untuk ganti", getError);
  if (!current) throw videoNotFound();

  const maxBytes = env.cloudinaryVideo?.maxBytes;
  const processed = validateVideo(req.file, maxBytes);

  // Unggah video baru terlebih dahulu ke Cloudinary
  const uploaded = await uploadVideoObject(module, recordId, processed.buffer);

  // Update record dengan CAS terhadap id dan public_id saat ini
  const patch = {
    public_id: uploaded.publicId,
    secure_url: uploaded.url,
    thumbnail_url: uploaded.thumbnailUrl,
    resource_type: "video",
    format: uploaded.format,
    bytes: uploaded.bytes,
    duration: uploaded.duration,
    width: uploaded.width,
    height: uploaded.height,
    uploaded_by: req.admin?.id || null,
  };

  const { data: updated, error: updateError } = await supabase
    .from(MEDIA_TABLE)
    .update(patch)
    .eq("id", current.id)
    .eq("public_id", current.public_id)
    .eq("status", "active")
    .select("*")
    .maybeSingle();

  if (updateError) {
    await removeNewVideoQuietly(uploaded.publicId, "replaceVideo: DB update gagal");
    throwDbError("media_videos: perbarui video", updateError);
  }

  if (!updated) {
    // CAS gagal: video telah diubah/dihapus bersamaan oleh request lain
    await removeNewVideoQuietly(uploaded.publicId, "replaceVideo: CAS gagal");
    throw videoConflict();
  }

  // Hapus video lama di Cloudinary setelah DB berhasil dialihkan
  await removeVideoQuietly(current.public_id, "replaceVideo: hapus video lama");

  return res.json({
    success: true,
    message: "Video berhasil diperbarui",
    data: { video: serializeVideo(updated) },
  });
};

// Menghapus video dari konten
const deleteVideo = async (req, res) => {
  const { module, recordId } = req.validated.params;

  const { data: current, error: getError } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("owner_module", module)
    .eq("record_id", recordId)
    .eq("status", "active")
    .maybeSingle();

  if (getError) throwDbError("media_videos: ambil untuk hapus", getError);
  if (!current) throw videoNotFound();

  // Hapus dari database (atau ubah status menjadi deleted)
  const { data: deleted, error: deleteError } = await supabase
    .from(MEDIA_TABLE)
    .delete()
    .eq("id", current.id)
    .eq("public_id", current.public_id)
    .select("id")
    .maybeSingle();

  if (deleteError) throwDbError("media_videos: hapus record", deleteError);
  if (!deleted) throw videoConflict();

  // Bersihkan aset di Cloudinary
  await removeVideoQuietly(current.public_id, "deleteVideo: hapus aset video");

  return res.json({
    success: true,
    message: "Video berhasil dihapus",
    data: { video: null },
  });
};

module.exports = {
  getVideo,
  getVideoById,
  uploadVideo,
  replaceVideo,
  deleteVideo,
  serializeVideo,
};

