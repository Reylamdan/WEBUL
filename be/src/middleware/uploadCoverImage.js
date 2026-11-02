const multer = require("multer");
const AppError = require("../utils/AppError");
const { MAX_FILE_SIZE, isSupportedUpload } = require("../utils/imageValidator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!isSupportedUpload(file.mimetype, file.originalname)) {
      return callback(
        new AppError(
          "Format file tidak didukung. Gunakan gambar JPEG, PNG, atau WebP",
          415,
          "UNSUPPORTED_FILE_TYPE"
        )
      );
    }
    return callback(null, true);
  },
});

// Multer melempar MulterError, bukan AppError. Tanpa pemetaan ini error seperti
// LIMIT_FILE_SIZE akan berakhir sebagai HTTP 500.
const uploadCoverImage = (req, res, next) => {
  upload.single("cover")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Ukuran file maksimal 5 MB", 413, "FILE_TOO_LARGE"));
      }

      // Text field, file ganda, field selain "cover", atau struktur multipart lain.
      return next(
        new AppError(
          "Hanya satu file dengan field cover yang diizinkan",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    return next(error);
  });
};

module.exports = uploadCoverImage;
