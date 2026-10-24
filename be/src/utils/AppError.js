// Error yang pesannya AMAN ditampilkan ke klien.
// Contoh: throw new AppError("Berita tidak ditemukan", 404, "NEWS_NOT_FOUND");
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;