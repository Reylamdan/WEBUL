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

// Pembatas upload dokumen akreditasi. Dipasang HANYA pada PUT /:id/document.
const documentUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak upload dokumen, coba lagi dalam 15 menit",
    code: "TOO_MANY_DOCUMENT_UPLOADS",
  },
});

// Pembatas upload file peraturan BAN-PT (dokumen utama & lampiran). Terpisah dari akreditasi.
const regulationUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak upload dokumen, coba lagi dalam 15 menit",
    code: "TOO_MANY_DOCUMENT_UPLOADS",
  },
});

// Pembatas preview/download dokumen (route publik /document, /attachments, dan /api/files/:token).
// Setiap hit yang lolos otorisasi bisa menarik file dari Google Drive, jadi dibatasi terpisah dari
// pembatas umum /api. Pembaca PDF memakai banyak request Range, sehingga batasnya cukup longgar.
// Penghitung disimpan di memori (ter-reset saat server restart, tidak dibagi antar instance).
const fileStreamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan file, coba lagi beberapa saat lagi",
    code: "TOO_MANY_FILE_REQUESTS",
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

module.exports = {
  loginLimiter,
  coverUploadLimiter,
  documentUploadLimiter,
  regulationUploadLimiter,
  fileStreamLimiter,
};
