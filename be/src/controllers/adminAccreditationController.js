const AppError = require("../utils/AppError");
const { validateDocument } = require("../utils/documentValidator");
const service = require("../services/accreditationService");

// Membuat handler admin untuk satu jenis data (institution / studyProgram).
const createAdminHandlers = (entityKey) => {
  const entity = service.ENTITIES[entityKey];

  const list = async (req, res) =>
    res.json({ success: true, data: await service.adminList(entity, req.validated.query) });

  const get = async (req, res) =>
    res.json({
      success: true,
      data: { accreditation: await service.adminGet(entity, req.validated.params.id) },
    });

  const create = async (req, res) => {
    const accreditation = await service.adminCreate(entity, req.body, req.admin.id);
    return res.status(201).json({
      success: true,
      message: `${entity.label} berhasil dibuat`,
      data: { accreditation },
    });
  };

  const update = async (req, res) => {
    const accreditation = await service.adminUpdate(entity, req.validated.params.id, req.body);
    return res.json({
      success: true,
      message: `${entity.label} berhasil diperbarui`,
      data: { accreditation },
    });
  };

  const remove = async (req, res) => {
    await service.adminDelete(entity, req.validated.params.id);
    return res.json({ success: true, message: `${entity.label} berhasil dihapus` });
  };

  // Middleware: pastikan data ada sebelum file diproses
  const loadRecord = async (req, res, next) => {
    req.accreditationRecord = await service.loadForDocument(entity, req.validated.params.id);
    return next();
  };

  const putDocument = async (req, res) => {
    if (!req.file) throw new AppError("File dokumen wajib diisi", 400, "FILE_REQUIRED");
    const processed = validateDocument(req.file);
    const accreditation = await service.adminSetDocument(entity, req.accreditationRecord, processed);
    return res.json({
      success: true,
      message: "Dokumen berhasil diperbarui",
      data: { accreditation },
    });
  };

  const deleteDocument = async (req, res) => {
    const accreditation = await service.adminRemoveDocument(entity, req.accreditationRecord);
    return res.json({
      success: true,
      message: "Dokumen berhasil dihapus",
      data: { accreditation },
    });
  };

  const filterOptions = async (req, res) =>
    res.json({ success: true, data: await service.listFilterOptions(entity, { admin: true }) });

  return { list, get, filterOptions, create, update, remove, loadRecord, putDocument, deleteDocument };
};

module.exports = {
  institution: createAdminHandlers("institution"),
  studyProgram: createAdminHandlers("studyProgram"),
};
