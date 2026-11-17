const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { validateAndReencode } = require("../utils/imageValidator");
const { buildAgendaImagePath, uploadCoverObject, removeCoverObjectQuietly } = require("../utils/coverStorage");
const { TABLE, EVENT_COLUMNS, serializeEvent, eventNotFound } = require("../services/agendaEventService");

const imageNotFound = () => new AppError("Gambar acara tidak ditemukan", 404, "AGENDA_IMAGE_NOT_FOUND");
const imageConflict = () => new AppError("Gambar acara berubah, silakan coba lagi", 409, "AGENDA_IMAGE_CONFLICT");

const loadEventForImage = async (req, res, next) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(TABLE).select("id, image_path").eq("id", id).maybeSingle();
  if (error) throwDbError("agenda: ambil untuk gambar", error);
  if (!data) throw eventNotFound();
  req.agendaEvent = data;
  return next();
};

// PUT /api/admin/agenda-events/:id/image  (multipart, field "cover")
const putImage = async (req, res) => {
  const event = req.agendaEvent;
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const processed = await validateAndReencode(req.file);
  const newPath = buildAgendaImagePath(event.id, processed.extension);
  const oldPath = event.image_path;

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  // Compare-and-set terhadap path lama agar upload bersamaan tidak saling menimpa.
  let query = supabase.from(TABLE).update({ image_path: newPath }).eq("id", event.id);
  query = oldPath ? query.eq("image_path", oldPath) : query.is("image_path", null);
  const { data: updated, error } = await query.select(EVENT_COLUMNS).maybeSingle();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putImage: kompensasi setelah DB gagal");
    throwDbError("agenda: perbarui image_path", error);
  }
  if (!updated) {
    await removeCoverObjectQuietly(newPath, "putImage: kompensasi karena CAS gagal");
    throw imageConflict();
  }

  if (oldPath) await removeCoverObjectQuietly(oldPath, "putImage: hapus gambar lama");

  return res.json({
    success: true,
    message: "Gambar acara berhasil diperbarui",
    data: { event: serializeEvent(updated) },
  });
};

// DELETE /api/admin/agenda-events/:id/image
const deleteImage = async (req, res) => {
  const event = req.agendaEvent;
  const oldPath = event.image_path;
  if (!oldPath) throw imageNotFound();

  const { data: updated, error } = await supabase
    .from(TABLE)
    .update({ image_path: null })
    .eq("id", event.id)
    .eq("image_path", oldPath)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) throwDbError("agenda: hapus image_path", error);
  if (!updated) throw imageConflict();

  await removeCoverObjectQuietly(oldPath, "deleteImage: hapus file gambar");

  return res.json({
    success: true,
    message: "Gambar acara berhasil dihapus",
    data: { event: serializeEvent(updated) },
  });
};

module.exports = { loadEventForImage, putImage, deleteImage };
