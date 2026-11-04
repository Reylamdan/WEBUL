const { rateLimit } = require("express-rate-limit");

// Melindungi kuota free tier Gemini: setiap preview = 1 panggilan API.
// Berlaku di atas pembatas umum /api. Penghitung disimpan di memori (reset saat server restart).
const translationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan terjemahan, coba lagi sebentar lagi",
    code: "TOO_MANY_TRANSLATIONS",
  },
});

module.exports = { translationLimiter };
