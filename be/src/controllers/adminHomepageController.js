const service = require("../services/homepageService");
const AppError = require("../utils/AppError");
const { validateAndReencode } = require("../utils/imageValidator");
const {
  buildHomepageImagePath,
  uploadCoverObject,
  removeCoverObjectQuietly,
} = require("../utils/coverStorage");
const { purgeVideosForRecord } = require("../services/videoStorageService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// ---------- TEKS ----------

const getContent = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getContent() });
});

const updateContent = asyncHandler(async (req, res) => {
  const data = await service.updateContent(req.body);
  res.json({ success: true, message: "Konten beranda berhasil disimpan", data });
});

const resetSection = asyncHandler(async (req, res) => {
  const data = await service.resetSection(req.params.section);
  res.json({ success: true, message: "Section dikembalikan ke teks bawaan", data });
});

// ---------- FOTO ----------

const listPhotos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adminListPhotos(req.validated.query) });
});

const getPhoto = asyncHandler(async (req, res) => {
  const photo = await service.adminGetPhoto(req.validated.params.id);
  res.json({ success: true, data: { photo } });
});

const createPhoto = asyncHandler(async (req, res) => {
  const photo = await service.adminCreatePhoto(req.body);
  res.status(201).json({ success: true, data: { photo } });
});

const updatePhoto = asyncHandler(async (req, res) => {
  const photo = await service.adminUpdatePhoto(req.validated.params.id, req.body);
  res.json({ success: true, data: { photo } });
});

const deletePhoto = asyncHandler(async (req, res) => {
  const oldPath = await service.adminDeletePhoto(req.validated.params.id);
  if (oldPath) await removeCoverObjectQuietly(oldPath, "deleteHomepagePhoto: hapus gambar");
  res.json({ success: true, message: "Foto beranda berhasil dihapus" });
});

// PUT /api/admin/homepage/photos/:id/image  (multipart, field "cover")
const putPhotoImage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const current = await service.findPhotoRow(id, "homepage_photos: cari untuk gambar");
  if (!current) throw new AppError("Foto beranda tidak ditemukan", 404, "HOMEPAGE_PHOTO_NOT_FOUND");

  const processed = await validateAndReencode(req.file);
  const newPath = buildHomepageImagePath(id, processed.extension);

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  let photo;
  try {
    photo = await service.adminSetPhotoImage(id, newPath);
  } catch (error) {
    await removeCoverObjectQuietly(newPath, "putHomepagePhoto: kompensasi");
    throw error;
  }

  if (current.image_path) {
    await removeCoverObjectQuietly(current.image_path, "putHomepagePhoto: hapus lama");
  }

  res.json({ success: true, message: "Foto berhasil diunggah", data: { photo } });
});

const deletePhotoImage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const current = await service.findPhotoRow(id, "homepage_photos: cari untuk hapus gambar");
  if (!current) throw new AppError("Foto beranda tidak ditemukan", 404, "HOMEPAGE_PHOTO_NOT_FOUND");
  if (!current.image_path) throw new AppError("Gambar tidak ditemukan", 404, "IMAGE_NOT_FOUND");

  const photo = await service.adminSetPhotoImage(id, null);
  await removeCoverObjectQuietly(current.image_path, "deleteHomepagePhotoImage: hapus");
  res.json({ success: true, data: { photo } });
});

// ---------- VIDEO ----------
// Metadata video diurus di sini; FILE video diunggah lewat
// /api/admin/videos/homepage-videos/:id (modul Cloudinary yang sudah ada).

const listVideos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adminListVideos(req.validated.query) });
});

const getVideo = asyncHandler(async (req, res) => {
  const video = await service.adminGetVideo(req.validated.params.id);
  res.json({ success: true, data: { video } });
});

const createVideo = asyncHandler(async (req, res) => {
  const video = await service.adminCreateVideo(req.body);
  res.status(201).json({ success: true, data: { video } });
});

const updateVideo = asyncHandler(async (req, res) => {
  const video = await service.adminUpdateVideo(req.validated.params.id, req.body);
  res.json({ success: true, data: { video } });
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await service.adminDeleteVideo(id);
  await purgeVideosForRecord(service.VIDEO_MODULE, id, "deleteHomepageVideo");
  res.json({ success: true, message: "Video beranda berhasil dihapus" });
});

module.exports = {
  getContent,
  updateContent,
  resetSection,
  listPhotos,
  getPhoto,
  createPhoto,
  updatePhoto,
  deletePhoto,
  putPhotoImage,
  deletePhotoImage,
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
};
