const { rateLimit } = require("express-rate-limit");

// Pembatas upload cover. Dipasang HANYA pada PUT /:id/cover, di atas pembatas
// umum /api pada app.js. Request yang ditolak sebelum tahap ini (misalnya berita
// tidak ditemukan) tidak ikut dihitung.
const coverUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak upload cover, coba lagi dalam 15 menit",
    code: "TOO_MANY_COVER_UPLOADS",
  },
});

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

module.exports = { loginLimiter, coverUploadLimiter };