const AppError = require("../utils/AppError");

const SOURCES = ["body", "query", "params"];

// Memvalidasi req.body (default), req.query, atau req.params dengan skema Zod.
//   validate(schema)           -> memvalidasi body (perilaku lama, tidak berubah)
//   validate(schema, "query")  -> memvalidasi query string
//   validate(schema, "params") -> memvalidasi parameter URL
//
// Body: jika valid, req.body diganti dengan data yang sudah dibersihkan (trim, huruf kecil, dll).
// Query/params: hasilnya disimpan di req.validated.query / req.validated.params, karena di
// Express 5 req.query hanya bisa dibaca (getter) dan tidak bisa ditimpa.
// Catatan Express 5: req.body bernilai undefined jika request tidak punya body.
const validate = (schema, source = "body") => {
  if (!SOURCES.includes(source)) {
    throw new Error(`validate: source tidak dikenal "${source}" (pilihan: ${SOURCES.join(", ")})`);
  }

  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));
      return next(
        new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", details)
      );
    }

    if (source === "body") {
      req.body = result.data;
    } else {
      req.validated = req.validated || {};
      req.validated[source] = result.data;
    }
    return next();
  };
};

module.exports = validate;