const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { searchAll } = require("../controllers/publicSearchController");
const validate = require("../middleware/validate");
const { searchQuerySchema } = require("../validators/searchValidator");

const router = express.Router();

// Satu request pencarian menjalankan beberapa query database, jadi dibatasi lebih ketat daripada
// pembatas umum /api. Penghitung disimpan di memori (ter-reset saat server restart).
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan pencarian, coba lagi sebentar lagi",
    code: "TOO_MANY_SEARCH_REQUESTS",
  },
});

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET.
router.get("/", searchLimiter, validate(searchQuerySchema, "query"), searchAll);

module.exports = router;
