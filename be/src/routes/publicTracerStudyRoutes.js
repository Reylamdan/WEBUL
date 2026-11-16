const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { summary, filters } = require("../controllers/publicTracerStudyController");
const validate = require("../middleware/validate");
const { tracerStudyQuerySchema } = require("../validators/tracerStudyValidator");

const router = express.Router();

// Setiap request menghitung statistik dari seluruh data, jadi dibatasi lebih ketat daripada
// pembatas umum /api. Penghitung disimpan di memori (ter-reset saat server restart).
const tracerStudyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan data tracer study, coba lagi sebentar lagi",
    code: "TOO_MANY_TRACER_STUDY_REQUESTS",
  },
});

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET.
router.get("/summary", tracerStudyLimiter, validate(tracerStudyQuerySchema, "query"), summary);
router.get("/filters", tracerStudyLimiter, filters);

module.exports = router;