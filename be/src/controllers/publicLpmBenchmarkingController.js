const service = require("../services/lpmBenchmarkingService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/lpm-benchmarkings
const list = asyncHandler(async (req, res) => {
  const data = await service.publicList(req.validated.query);
  res.json({ success: true, data });
});

// GET /api/lpm-benchmarkings/filter-options
const filterOptions = asyncHandler(async (req, res) => {
  const data = await service.listFilterOptions({ admin: false });
  res.json({ success: true, data });
});

// GET /api/lpm-benchmarkings/:id
const get = asyncHandler(async (req, res) => {
  const benchmarking = await service.publicGet(req.validated.params.id);
  res.json({ success: true, data: { benchmarking } });
});

module.exports = { list, filterOptions, get };
