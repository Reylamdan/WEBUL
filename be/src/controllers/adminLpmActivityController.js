const service = require("../services/lpmActivityService");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const list = asyncHandler(async (req, res) => {
  const data = await service.adminList(req.validated.query);
  res.json({ success: true, data });
});

const get = asyncHandler(async (req, res) => {
  const activity = await service.adminGet(req.validated.params.id);
  res.json({ success: true, data: { activity } });
});

const create = asyncHandler(async (req, res) => {
  const activity = await service.adminCreate(req.body);
  res.status(201).json({ success: true, data: { activity } });
});

const update = asyncHandler(async (req, res) => {
  const activity = await service.adminUpdate(req.validated.params.id, req.body);
  res.json({ success: true, data: { activity } });
});

const remove = asyncHandler(async (req, res) => {
  await service.adminDelete(req.validated.params.id);
  res.json({ success: true, message: "Kegiatan LPM berhasil dihapus" });
});

module.exports = { list, get, create, update, remove };
