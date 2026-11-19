const service = require("../services/lpmActivityService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// GET /api/lpm-activities
const list = asyncHandler(async (req, res) => {
  const data = await service.publicList();
  res.json({ success: true, data });
});

module.exports = { list };
