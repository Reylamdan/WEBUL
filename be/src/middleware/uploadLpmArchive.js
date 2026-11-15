
const multer = require("multer");
const AppError = require("../utils/AppError");

const {
  MAX_DOCUMENT_SIZE,
  UNSUPPORTED_MESSAGE,
  isSupportedArchiveUpload,
} = require("../utils/lpmArchiveValidator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!isSupportedArchiveUpload(file.mimetype, file.originalname)) {
      return callback(
        new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE")
      );
    }

    return callback(null, true);
  },
});

const uploadDocument = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError("Ukuran file maksimal 20 MB", 413, "FILE_TOO_LARGE")
        );
      }

      return next(
        new AppError(
          "Upload hanya menerima satu file melalui field document",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    return next(error);
  });
};

module.exports = { uploadDocument };
