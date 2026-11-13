const multer = require("multer");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const {
  DEFAULT_MAX_VIDEO_SIZE,
  UNSUPPORTED_MESSAGE,
  isSupportedVideoUpload,
} = require("../utils/videoValidator");

const getMaxBytes = () => (env.cloudinaryVideo && env.cloudinaryVideo.maxBytes) || DEFAULT_MAX_VIDEO_SIZE;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    get fileSize() {
      return getMaxBytes();
    },
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!isSupportedVideoUpload(file.mimetype, file.originalname)) {
      return callback(new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE"));
    }
    return callback(null, true);
  },
});

// Multer melempar MulterError, bukan AppError. Dipetakan agar tidak menjadi HTTP 500.
const uploadVideoFile = (req, res, next) => {
  upload.single("video")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        const maxMb = Math.round(getMaxBytes() / (1024 * 1024));
        return next(new AppError(`Ukuran file maksimal ${maxMb} MB`, 413, "FILE_TOO_LARGE"));
      }

      return next(
        new AppError(
          "Hanya satu file dengan field video yang diizinkan",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    return next(error);
  });
};

module.exports = uploadVideoFile;

