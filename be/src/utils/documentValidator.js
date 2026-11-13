const path = require("path");
const AppError = require("./AppError");

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

// Format yang diizinkan untuk dokumen SK / sertifikat akreditasi.
// Ekstensi keluaran selalu mengikuti format ASLI hasil deteksi isi file, bukan nama file pengguna.
const FORMATS = {
  pdf: {
    mime: "application/pdf",
    extensions: [".pdf"],
    outputExtension: "pdf",
    matches: (b) => b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  jpeg: {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    outputExtension: "jpg",
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  png: {
    mime: "image/png",
    extensions: [".png"],
    outputExtension: "png",
    matches: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
};

const MIME_FORMATS = new Map(Object.entries(FORMATS).map(([format, c]) => [c.mime, format]));
const EXTENSION_FORMATS = new Map(
  Object.entries(FORMATS).flatMap(([format, c]) => c.extensions.map((ext) => [ext, format]))
);

const UNSUPPORTED_MESSAGE = "Format file tidak didukung. Gunakan PDF, JPEG, atau PNG";

const unsupportedType = () => new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE");

// Validasi awal di Multer: MIME dan ekstensi harus sama-sama didukung dan menunjuk format yang sama.
const isSupportedDocumentUpload = (mimeType, originalName) => {
  const fromMime = MIME_FORMATS.get(mimeType);
  const extension = path.extname(originalName || "").toLowerCase();
  return Boolean(fromMime && EXTENSION_FORMATS.get(extension) === fromMime);
};

// Nama asli untuk ditampilkan: tanpa path, tanpa karakter kontrol, dipotong. Tidak dipakai sebagai path storage.
const sanitizeDisplayName = (originalName) => {
  const base = path.basename(String(originalName || "").replace(/\\/g, "/"));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  return (cleaned || "dokumen").slice(0, 150);
};

// Memeriksa isi file (magic bytes) agar cocok dengan MIME dan ekstensi yang dikirim.
const validateDocument = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError("File dokumen kosong atau tidak valid", 400, "INVALID_DOCUMENT");
  }
  if (file.buffer.length > MAX_DOCUMENT_SIZE) {
    throw new AppError("Ukuran file maksimal 10 MB", 413, "FILE_TOO_LARGE");
  }

  const fromMime = MIME_FORMATS.get(file.mimetype);
  const fromExt = EXTENSION_FORMATS.get(path.extname(file.originalname || "").toLowerCase());
  if (!fromMime || !fromExt) throw unsupportedType();
  if (fromMime !== fromExt) {
    throw new AppError(
      "Tipe file tidak sesuai dengan ekstensi yang dikirim",
      400,
      "INVALID_DOCUMENT"
    );
  }

  const detected = Object.keys(FORMATS).find((format) => FORMATS[format].matches(file.buffer));
  if (!detected) {
    throw new AppError("Isi file bukan PDF, JPEG, atau PNG yang valid", 400, "INVALID_DOCUMENT");
  }
  if (detected !== fromMime) {
    throw new AppError(
      "Isi file tidak sesuai dengan tipe atau ekstensi yang dikirim",
      400,
      "INVALID_DOCUMENT"
    );
  }

  return {
    buffer: file.buffer,
    mimeType: FORMATS[detected].mime,
    extension: FORMATS[detected].outputExtension,
    size: file.buffer.length,
    displayName: sanitizeDisplayName(file.originalname),
  };
};

module.exports = {
  MAX_DOCUMENT_SIZE,
  UNSUPPORTED_MESSAGE,
  isSupportedDocumentUpload,
  sanitizeDisplayName,
  validateDocument,
};
