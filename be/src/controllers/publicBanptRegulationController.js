const service = require("../services/banptRegulationService");

// Handler publik: hanya data published yang pernah bisa dikembalikan.
const list = async (req, res) =>
  res.json({ success: true, data: await service.publicList(req.validated.query) });

const get = async (req, res) =>
  res.json({ success: true, data: { regulation: await service.publicGet(req.validated.params.id) } });

const filterOptions = async (req, res) =>
  res.json({ success: true, data: await service.listFilterOptions({ admin: false }) });

module.exports = { list, get, filterOptions };
