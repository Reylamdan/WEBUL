
const { rateLimit } = require("express-rate-limit");

// Pembatas upload cover.
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

// Pembatas upload dokumen akreditasi.
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

// Pembatas upload file peraturan BAN-PT.
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

// Pembatas preview dan download dokumen.
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

// Pembatas khusus login.
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

// Pembatas endpoint OAuth Google Drive.
// Limit dihitung bersama untuk connect + callback + disconnect dari satu IP (satu percobaan koneksi = 2 request).
// 10 terlalu ketat: admin yang mengulang koneksi saat menyiapkan OAuth cepat terkena 429.
const googleOAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan koneksi Google Drive, coba lagi dalam 15 menit",
    code: "TOO_MANY_GOOGLE_OAUTH_ATTEMPTS",
  },
});

module.exports = {
  loginLimiter,
  coverUploadLimiter,
  documentUploadLimiter,
  regulationUploadLimiter,
  fileStreamLimiter,
  googleOAuthLimiter,
};
