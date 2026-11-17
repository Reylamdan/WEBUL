const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { validateAndReencode } = require("../utils/imageValidator");
const { buildOrganizationImagePath, uploadCoverObject, removeCoverObjectQuietly } = require("../utils/coverStorage");
const { TABLE, UNIT_COLUMNS, serializeUnit, unitNotFound } = require("../services/organizationUnitService");

const imageNotFound = () => new AppError("Gambar tidak ditemukan", 404, "ORGANIZATION_IMAGE_NOT_FOUND");
const imageConflict = () => new AppError("Gambar berubah, silakan coba lagi", 409, "ORGANIZATION_IMAGE_CONFLICT");

const loadUnitForImage = async (req, res, next) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(TABLE).select("id, image_path").eq("id", id).maybeSingle();
  if (error) throwDbError("organisasi: ambil untuk gambar", error);
  if (!data) throw unitNotFound();
  req.organizationUnit = data;
  return next();
};

// PUT /api/admin/organization-units/:id/image  (multipart, field "cover")
const putImage = async (req, res) => {
  const unit = req.organizationUnit;
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const processed = await validateAndReencode(req.file);
  const newPath = buildOrganizationImagePath(unit.id, processed.extension);
  const oldPath = unit.image_path;

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  // Compare-and-set terhadap path lama agar upload bersamaan tidak saling menimpa.
  let query = supabase.from(TABLE).update({ image_path: newPath, updated_at: new Date().toISOString() }).eq("id", unit.id);
  query = oldPath ? query.eq("image_path", oldPath) : query.is("image_path", null);
  const { data: updated, error } = await query.select(UNIT_COLUMNS).maybeSingle();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putImage organisasi: kompensasi setelah DB gagal");
    throwDbError("organisasi: perbarui image_path", error);
  }
  if (!updated) {
    await removeCoverObjectQuietly(newPath, "putImage organisasi: kompensasi karena CAS gagal");
    throw imageConflict();
  }
  if (oldPath) await removeCoverObjectQuietly(oldPath, "putImage organisasi: hapus gambar lama");

  return res.json({ success: true, message: "Gambar berhasil diperbarui", data: { unit: serializeUnit(updated) } });
};

// DELETE /api/admin/organization-units/:id/image
const deleteImage = async (req, res) => {
  const unit = req.organizationUnit;
  const oldPath = unit.image_path;
  if (!oldPath) throw imageNotFound();

  const { data: updated, error } = await supabase
    .from(TABLE)
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq("id", unit.id)
    .eq("image_path", oldPath)
    .select(UNIT_COLUMNS)
    .maybeSingle();
  if (error) throwDbError("organisasi: hapus image_path", error);
  if (!updated) throw imageConflict();

  await removeCoverObjectQuietly(oldPath, "deleteImage organisasi: hapus file gambar");

  return res.json({ success: true, message: "Gambar berhasil dihapus", data: { unit: serializeUnit(updated) } });
};

module.exports = { loadUnitForImage, putImage, deleteImage };
