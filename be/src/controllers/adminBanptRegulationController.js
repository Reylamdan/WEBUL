const AppError = require("../utils/AppError");
const { validatePdf } = require("../utils/pdfValidator");
const service = require("../services/banptRegulationService");

const list = async (req, res) =>
  res.json({ success: true, data: await service.adminList(req.validated.query) });

const get = async (req, res) =>
  res.json({ success: true, data: { regulation: await service.adminGet(req.validated.params.id) } });

const filterOptions = async (req, res) =>
  res.json({ success: true, data: await service.listFilterOptions({ admin: true }) });

const create = async (req, res) =>
  res.status(201).json({
    success: true,
    message: "Peraturan BAN-PT berhasil dibuat",
    data: { regulation: await service.adminCreate(req.body) },
  });

const update = async (req, res) =>
  res.json({
    success: true,
    message: "Peraturan BAN-PT berhasil diperbarui",
    data: { regulation: await service.adminUpdate(req.validated.params.id, req.body) },
  });

const remove = async (req, res) => {
  await service.adminDelete(req.validated.params.id);
  return res.json({ success: true, message: "Peraturan BAN-PT dan seluruh filenya berhasil dihapus" });
};

// Middleware: pastikan data ada sebelum file diproses
const loadRecord = async (req, res, next) => {
  await service.loadForUpload(req.validated.params.id);
  return next();
};

const putDocument = async (req, res) => {
  if (!req.file) throw new AppError("File dokumen wajib diisi (field document)", 400, "FILE_REQUIRED");
  const processed = validatePdf(req.file);
  return res.json({
    success: true,
    message: "Dokumen utama berhasil diperbarui",
    data: { regulation: await service.adminSetDocument(req.validated.params.id, processed) },
  });
};

const addAttachments = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError("Minimal satu file lampiran wajib diisi (field attachments)", 400, "FILE_REQUIRED");
  }
  const processed = req.files.map(validatePdf); // semua divalidasi dulu sebelum ada yang diunggah
  return res.status(201).json({
    success: true,
    message: `${processed.length} lampiran berhasil ditambahkan`,
    data: { regulation: await service.adminAddAttachments(req.validated.params.id, processed) },
  });
};

const replaceAttachment = async (req, res) => {
  if (!req.file) throw new AppError("File lampiran wajib diisi (field attachment)", 400, "FILE_REQUIRED");
  const processed = validatePdf(req.file);
  const { id, attachmentId } = req.validated.params;
  return res.json({
    success: true,
    message: "Lampiran berhasil diganti",
    data: { regulation: await service.adminReplaceAttachment(id, attachmentId, processed) },
  });
};

const removeAttachment = async (req, res) => {
  const { id, attachmentId } = req.validated.params;
  return res.json({
    success: true,
    message: "Lampiran berhasil dihapus",
    data: { regulation: await service.adminRemoveAttachment(id, attachmentId) },
  });
};

module.exports = {
  list, get, filterOptions, create, update, remove, loadRecord,
  putDocument, addAttachments, replaceAttachment, removeAttachment,
};
