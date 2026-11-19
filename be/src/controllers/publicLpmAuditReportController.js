const service = require("../services/lpmAuditReportService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/lpm-audit-reports
const list = asyncHandler(async (req, res) => {
  const data = await service.publicList();
  res.json({ success: true, data });
});

// GET /api/lpm-audit-reports/by-year/:year
const getByYear = asyncHandler(async (req, res) => {
  const report = await service.publicGetByYear(req.validated.params.year);
  res.json({ success: true, data: { report } });
});

// GET /api/lpm-audit-reports/:id
const get = asyncHandler(async (req, res) => {
  const report = await service.publicGet(req.validated.params.id);
  res.json({ success: true, data: { report } });
});

module.exports = { list, get, getByYear };
