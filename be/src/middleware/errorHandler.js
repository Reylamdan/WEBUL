const env = require("../config/env");

// Global error handler. Express 5 otomatis meneruskan error dari handler async
// ke middleware ini, jadi controller tidak perlu try/catch hanya untuk itu.
// Harus punya 4 parameter agar dikenali Express sebagai error handler.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Jika respons sudah mulai dikirim, serahkan ke handler bawaan Express
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Terjadi kesalahan pada server";
  let details;

  if (err && err.isOperational) {
    // Error yang sengaja dilempar lewat AppError
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err && err.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Format JSON pada body request tidak valid";
  } else if (err && err.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Ukuran body request terlalu besar";
  }

  // Log di sisi server saja. Body request sengaja tidak dicatat
  // karena bisa berisi password atau token.
  if (statusCode >= 500) {
    console.error(
      `[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}`,
      env.isProduction ? err && err.message : err
    );
  }

  const body = { success: false, message, code };

  // Detail error (misalnya daftar kesalahan validasi), jika ada
  if (details !== undefined) {
    body.errors = details;
  }

  // Stack trace hanya untuk development
  if (!env.isProduction && statusCode >= 500 && err && err.stack) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
};

module.exports = errorHandler;