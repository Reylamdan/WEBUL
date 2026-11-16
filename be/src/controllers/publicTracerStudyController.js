const { getTracerStudySummary, getTracerStudyFilters } = require("../services/tracerStudyService");

// ---------------------------------------------------------------------
// GET /api/tracer-study/summary?year=2025&program=Manajemen
// Publik, tanpa login. Hanya angka agregat; data mentah responden tidak pernah dikirim.
// ---------------------------------------------------------------------
const summary = async (req, res) => {
  const { year, program } = req.validated.query;
  const data = await getTracerStudySummary({ year, program });
  return res.json({ success: true, data });
};

// ---------------------------------------------------------------------
// GET /api/tracer-study/filters
// Daftar tahun survei dan program studi yang tersedia.
// ---------------------------------------------------------------------
const filters = async (req, res) => {
  const data = await getTracerStudyFilters();
  return res.json({ success: true, data });
};

module.exports = { summary, filters };