const AppError = require("../utils/AppError");

// Memvalidasi req.body dengan skema Zod.
// Jika valid, req.body diganti dengan data yang sudah dibersihkan (trim, huruf kecil, dll).
// Catatan Express 5: req.body bernilai undefined jika request tidak punya body.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return next(
      new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", details)
    );
  }

  req.body = result.data;
  return next();
};

module.exports = validate;