const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { summary, filters, submit } = require("../controllers/publicTracerStudyController");
const validate = require("../middleware/validate");
const { tracerStudyQuerySchema } = require("../validators/tracerStudyValidator");
const { submissionSchema } = require("../validators/tracerStudySubmissionValidator");

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

// Pengiriman form: dibatasi per IP agar tidak bisa dipakai membanjiri data responden.
const tracerStudySubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak pengiriman form, coba lagi dalam 15 menit",
    code: "TOO_MANY_TRACER_STUDY_SUBMISSIONS",
  },
});

// Endpoint publik terbuka untuk semua pengunjung tanpa login.
router.get("/summary", tracerStudyLimiter, validate(tracerStudyQuerySchema, "query"), summary);
router.get("/filters", tracerStudyLimiter, filters);
router.post("/submissions", tracerStudySubmitLimiter, validate(submissionSchema), submit);

module.exports = router;