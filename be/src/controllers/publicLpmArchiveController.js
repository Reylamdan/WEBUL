
const service = require("../services/lpmArchiveService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/lpm-archives
const list = asyncHandler(async (req, res) => {
  const result = await service.publicList(
    req.validated.query
  );

  res.json({
    success: true,
    data: result,
  });
});

// GET /api/lpm-archives/filter-options
const filterOptions = asyncHandler(async (req, res) => {
  const result = await service.listFilterOptions({
    admin: false,
  });

  res.json({
    success: true,
    data: result,
  });
});

// GET /api/lpm-archives/:id
const get = asyncHandler(async (req, res) => {
  const archive = await service.publicGet(
    req.validated.params.id
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
};
