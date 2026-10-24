const AppError = require("../utils/AppError");

// Dijalankan jika tidak ada route yang cocok.
const notFound = (req, res, next) => {
  next(new AppError("Endpoint tidak ditemukan", 404, "NOT_FOUND"));
};

module.exports = notFound;