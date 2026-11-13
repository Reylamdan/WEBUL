
const env = require("../config/env");

// Global error handler.
// Express 5 otomatis meneruskan error dari handler async.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Terjadi kesalahan pada server";
  let details;

  if (err && err.isOperational) {
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

  // Log error hanya di sisi server.
  // Body request tidak dicatat karena dapat berisi data sensitif.
  if (statusCode >= 500) {
    console.error(
      `[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}`,
      env.isProduction ? err && err.message : err
    );
  }

  const body = { success: false, message, code };

  if (details !== undefined) {
    body.errors = details;
  }

  // Stack trace tidak pernah dikirim ke client.
  return res.status(statusCode).json(body);
};

module.exports = errorHandler;
