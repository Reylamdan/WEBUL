const path = require("path");
const AppError = require("./AppError");
const { sanitizeDisplayName } = require("./documentValidator");

// Dokumen peraturan BAN-PT: HANYA PDF, maksimal 20 MB per file.
const MAX_PDF_SIZE = 20 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const PDF_MESSAGE = "Format file tidak didukung. Gunakan file PDF";

// Validasi awal di Multer: MIME dan ekstensi harus sama-sama PDF.
const isPdfUpload = (mimeType, originalName) =>
  mimeType === PDF_MIME && path.extname(originalName || "").toLowerCase() === ".pdf";

// Validasi isi file (magic bytes "%PDF-"), supaya file lain yang hanya berganti nama ditolak.
const validatePdf = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError("File dokumen kosong atau tidak valid", 400, "INVALID_DOCUMENT");
  }
  if (file.buffer.length > MAX_PDF_SIZE) {
    throw new AppError("Ukuran file maksimal 20 MB", 413, "FILE_TOO_LARGE");
  }
  if (!isPdfUpload(file.mimetype, file.originalname)) {
    throw new AppError(PDF_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE");
  }
  if (file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new AppError("Isi file bukan PDF yang valid", 400, "INVALID_DOCUMENT");
  }
  return {
    buffer: file.buffer,
    mimeType: PDF_MIME,
    extension: "pdf",
    size: file.buffer.length,
    displayName: sanitizeDisplayName(file.originalname),
  };
};

module.exports = { MAX_PDF_SIZE, PDF_MESSAGE, isPdfUpload, validatePdf };
