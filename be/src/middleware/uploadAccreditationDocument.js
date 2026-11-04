const multer = require("multer");
const AppError = require("../utils/AppError");
const {
  MAX_DOCUMENT_SIZE,
  UNSUPPORTED_MESSAGE,
  isSupportedDocumentUpload,
} = require("../utils/documentValidator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!isSupportedDocumentUpload(file.mimetype, file.originalname)) {
      return callback(new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE"));
    }
    return callback(null, true);
  },
});

// Multer melempar MulterError, bukan AppError; dipetakan agar tidak berakhir sebagai HTTP 500.
const uploadAccreditationDocument = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Ukuran file maksimal 10 MB", 413, "FILE_TOO_LARGE"));
      }
      return next(
        new AppError(
          "Hanya satu file dengan field document yang diizinkan",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    return next(error);
  });
};

module.exports = uploadAccreditationDocument;
