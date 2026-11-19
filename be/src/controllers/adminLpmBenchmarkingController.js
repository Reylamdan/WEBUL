const service = require("../services/lpmBenchmarkingService");
const AppError = require("../utils/AppError");
const { validateArchiveDocument } = require("../utils/lpmArchiveValidator");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/admin/lpm-benchmarkings
const list = asyncHandler(async (req, res) => {
  const data = await service.adminList(req.validated.query);
  res.json({ success: true, data });
});

// GET /api/admin/lpm-benchmarkings/filter-options
const filterOptions = asyncHandler(async (req, res) => {
  const data = await service.listFilterOptions({ admin: true });
  res.json({ success: true, data });
});

// GET /api/admin/lpm-benchmarkings/:id
const get = asyncHandler(async (req, res) => {
  const benchmarking = await service.adminGet(req.validated.params.id);
  res.json({ success: true, data: { benchmarking } });
});

// POST /api/admin/lpm-benchmarkings
const create = asyncHandler(async (req, res) => {
  const benchmarking = await service.adminCreate(req.body);
  res.status(201).json({ success: true, data: { benchmarking } });
});

// PATCH /api/admin/lpm-benchmarkings/:id
const update = asyncHandler(async (req, res) => {
  const benchmarking = await service.adminUpdate(req.validated.params.id, req.body);
  res.json({ success: true, data: { benchmarking } });
});

// DELETE /api/admin/lpm-benchmarkings/:id
const remove = asyncHandler(async (req, res) => {
  await service.adminDelete(req.validated.params.id);
  res.json({ success: true, message: "Data benchmarking berhasil dihapus" });
});

// Memastikan data ada sebelum middleware upload berjalan.
const loadRecord = asyncHandler(async (req, res, next) => {
  await service.loadForUpload(req.validated.params.id);
  next();
});

// PUT /api/admin/lpm-benchmarkings/:id/document  (multipart, field "document")
const putDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Dokumen wajib diunggah", 400, "DOCUMENT_REQUIRED");
  }

  const processed = validateArchiveDocument(req.file);
  const benchmarking = await service.adminSetDocument(req.validated.params.id, processed);

  res.json({ success: true, data: { benchmarking } });
});

// DELETE /api/admin/lpm-benchmarkings/:id/document
const removeDocument = asyncHandler(async (req, res) => {
  const benchmarking = await service.adminRemoveDocument(req.validated.params.id);
  res.json({ success: true, data: { benchmarking } });
});

module.exports = {
  list,
  filterOptions,
  get,
  create,
  update,
  remove,
  loadRecord,
  putDocument,
  removeDocument,
};
