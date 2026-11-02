// Error yang pesannya AMAN ditampilkan ke klien.
// Contoh: throw new AppError("Berita tidak ditemukan", 404, "NEWS_NOT_FOUND");
// Parameter details (opsional) berisi daftar detail error, misalnya hasil validasi input.
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;