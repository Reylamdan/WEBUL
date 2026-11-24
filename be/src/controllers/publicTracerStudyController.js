const { getTracerStudySummary, getTracerStudyFilters } = require("../services/tracerStudyService");
const { createSubmission } = require("../services/tracerStudySubmissionService");

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

// ---------------------------------------------------------------------
// POST /api/tracer-study/submissions
// Publik: alumni mengirim data diri + jawaban tracer study.
// ---------------------------------------------------------------------
const submit = async (req, res) => {
  const data = await createSubmission(req.body);
  return res.status(201).json({ success: true, message: "Terima kasih, jawaban tracer study Anda sudah kami terima", data });
};

module.exports = { summary, filters, submit };