const service = require("../services/lpmAuditReportService");
const AppError = require("../utils/AppError");
const { validateArchiveDocument } = require("../utils/lpmArchiveValidator");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const list = asyncHandler(async (req, res) => {
  const data = await service.adminList(req.validated.query);
  res.json({ success: true, data });
});

const get = asyncHandler(async (req, res) => {
  const report = await service.adminGet(req.validated.params.id);
  res.json({ success: true, data: { report } });
});

const create = asyncHandler(async (req, res) => {
  const report = await service.adminCreate(req.body);
  res.status(201).json({ success: true, data: { report } });
});

const update = asyncHandler(async (req, res) => {
  const report = await service.adminUpdate(req.validated.params.id, req.body);
  res.json({ success: true, data: { report } });
});

const remove = asyncHandler(async (req, res) => {
  await service.adminDelete(req.validated.params.id);
  res.json({ success: true, message: "Laporan audit mutu berhasil dihapus" });
});

// Memastikan laporan ada sebelum middleware upload berjalan.
const loadRecord = asyncHandler(async (req, res, next) => {
  await service.loadForUpload(req.validated.params.id);
  next();
});

// PUT /api/admin/lpm-audit-reports/:id/document  (multipart, field "document")
const putDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Dokumen wajib diunggah", 400, "DOCUMENT_REQUIRED");
  }

  const processed = validateArchiveDocument(req.file);
  const report = await service.adminSetDocument(req.validated.params.id, processed);

  res.json({ success: true, data: { report } });
});

const removeDocument = asyncHandler(async (req, res) => {
  const report = await service.adminRemoveDocument(req.validated.params.id);
  res.json({ success: true, data: { report } });
});

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  loadRecord,
  putDocument,
  removeDocument,
};
