const { rateLimit } = require("express-rate-limit");

// Pembatas khusus login, berlaku di atas pembatas umum /api pada app.js.
// Hanya percobaan GAGAL yang dihitung (status >= 400); login berhasil tidak dihitung.
// Catatan: penghitung disimpan di memori, jadi ter-reset saat server restart.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login gagal, coba lagi dalam 15 menit",
    code: "TOO_MANY_LOGIN_ATTEMPTS",
  },
});

module.exports = { loginLimiter };