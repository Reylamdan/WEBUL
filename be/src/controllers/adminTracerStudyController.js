const AppError = require("../utils/AppError");
const service = require("../services/tracerStudyAdminService");

// GET /api/admin/tracer-study/years
const listYears = async (req, res) => {
  const data = await service.listYears();
  return res.json({ success: true, data });
};

// GET /api/admin/tracer-study/responses?year=&program=&page=&limit=
const listResponses = async (req, res) => {
  const data = await service.listResponses(req.validated.query);
  return res.json({ success: true, data });
};

// POST /api/admin/tracer-study/responses
const createResponse = async (req, res) => {
  const response = await service.createResponse(req.body);
  return res.status(201).json({ success: true, message: "Data responden berhasil ditambahkan", data: { response } });
};

// PATCH /api/admin/tracer-study/responses/:id
const updateResponse = async (req, res) => {
  const response = await service.updateResponse(req.validated.params.id, req.body);
  return res.json({ success: true, message: "Data responden berhasil diperbarui", data: { response } });
};

// DELETE /api/admin/tracer-study/responses/:id
const deleteResponse = async (req, res) => {
  await service.deleteResponse(req.validated.params.id);
  return res.json({ success: true, message: "Data responden berhasil dihapus" });
};

// POST /api/admin/tracer-study/import
const importResponses = async (req, res) => {
  const data = await service.importResponses(req.body);
  return res.status(201).json({ success: true, message: "Import data responden berhasil", data });
};

// DELETE /api/admin/tracer-study/years/:year?confirm=<tahun>
// Menghapus SELURUH data satu tahun survei, jadi wajib dikonfirmasi dengan tahun yang sama.
const deleteYear = async (req, res) => {
  const { year } = req.validated.params;
  const { confirm } = req.validated.query;
  if (confirm !== year) {
    throw new AppError("Konfirmasi tidak cocok dengan tahun survei yang akan dihapus", 400, "CONFIRMATION_MISMATCH");
  }

  const data = await service.deleteYear(year);
  return res.json({ success: true, message: "Data tahun survei berhasil dihapus", data });
};

module.exports = { listYears, listResponses, createResponse, updateResponse, deleteResponse, importResponses, deleteYear };
