
const service = require("../services/lpmArchiveService");
const {
  validateArchiveDocument,
} = require("../utils/lpmArchiveValidator");

// Wrapper agar error async diteruskan ke global error handler Express.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/admin/lpm-archives
const list = asyncHandler(async (req, res) => {
  const result = await service.adminList(
    req.validated.query
  );

  res.json({
    success: true,
    data: result,
  });
});

// GET /api/admin/lpm-archives/filter-options
const filterOptions = asyncHandler(async (req, res) => {
  const result = await service.listFilterOptions({
    admin: true,
  });

  res.json({
    success: true,
    data: result,
  });
});

// GET /api/admin/lpm-archives/:id
const get = asyncHandler(async (req, res) => {
  const archive = await service.adminGet(
    req.validated.params.id
  );

  res.json({
    success: true,
    data: { archive },
  });
});

// POST /api/admin/lpm-archives
const create = asyncHandler(async (req, res) => {
  const archive = await service.adminCreate(req.body);

  res.status(201).json({
    success: true,
    data: { archive },
  });
});

// PATCH /api/admin/lpm-archives/:id
const update = asyncHandler(async (req, res) => {
  const archive = await service.adminUpdate(
    req.validated.params.id,
    req.body
  );

  res.json({
    success: true,
    data: { archive },
  });
});

// DELETE /api/admin/lpm-archives/:id
const remove = asyncHandler(async (req, res) => {
  await service.adminDelete(
    req.validated.params.id
  );

  res.json({
    success: true,
    message: "Arsip berhasil dihapus",
  });
});

// Memastikan arsip tersedia sebelum middleware upload berjalan.
const loadRecord = asyncHandler(async (req, res, next) => {
  await service.loadForUpload(
    req.validated.params.id
  );

  next();
});

// PUT /api/admin/lpm-archives/:id/document
const putDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    const AppError = require("../utils/AppError");

    throw new AppError(
      "Dokumen wajib diunggah",
      400,
      "DOCUMENT_REQUIRED"
    );
  }

  const processed = validateArchiveDocument(req.file);

  const archive = await service.adminSetDocument(
    req.validated.params.id,
    processed
  );

  res.json({
    success: true,
    data: { archive },
  });
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
};
