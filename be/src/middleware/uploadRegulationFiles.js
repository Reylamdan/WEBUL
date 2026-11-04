const multer = require("multer");
const AppError = require("../utils/AppError");
const { MAX_PDF_SIZE, PDF_MESSAGE, isPdfUpload } = require("../utils/pdfValidator");

// Maksimal file per request (file ditampung di memori, jadi dibatasi: 5 x 20 MB = 100 MB).
const MAX_FILES_PER_REQUEST = 5;

const build = (maxFiles) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PDF_SIZE, files: maxFiles, fields: 0, parts: maxFiles },
    fileFilter: (req, file, callback) => {
      if (!isPdfUpload(file.mimetype, file.originalname)) {
        return callback(new AppError(PDF_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE"));
      }
      return callback(null, true);
    },
  });

// Multer melempar MulterError, bukan AppError; dipetakan agar tidak berakhir sebagai HTTP 500.
const wrap = (handler, fieldName, maxFiles) => (req, res, next) =>
  handler(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Ukuran file maksimal 20 MB", 413, "FILE_TOO_LARGE"));
      }
      return next(
        new AppError(
          `Gunakan field ${fieldName} (maksimal ${maxFiles} file PDF per request)`,
          400,
          "VALIDATION_ERROR"
        )
      );
    }
    return next(error);
  });

const mainUpload = build(1);
const multiUpload = build(MAX_FILES_PER_REQUEST);

module.exports = {
  MAX_FILES_PER_REQUEST,
  uploadMainDocument: wrap(mainUpload.single("document"), "document", 1),
  uploadAttachments: wrap(multiUpload.array("attachments", MAX_FILES_PER_REQUEST), "attachments", MAX_FILES_PER_REQUEST),
  uploadSingleAttachment: wrap(mainUpload.single("attachment"), "attachment", 1),
};
