const path = require("path");
const AppError = require("./AppError");

const DEFAULT_MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const DEFAULT_MAX_DURATION_SECONDS = 600; // 10 menit (600 detik)

// Format video yang didukung untuk web
const FORMATS = {
  mp4: {
    mime: "video/mp4",
    extensions: [".mp4"],
    outputExtension: "mp4",
    matches: (b) => {
      if (b.length < 12) return false;
      // ISO Base Media File Format: box 'ftyp' pada byte 4-7
      return b.subarray(4, 8).toString("latin1") === "ftyp";
    },
  },
  webm: {
    mime: "video/webm",
    extensions: [".webm"],
    outputExtension: "webm",
    matches: (b) => {
      if (b.length < 4) return false;
      // EBML Header ID: 0x1A 0x45 0xDF 0xA3
      return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    },
  },
  quicktime: {
    mime: "video/quicktime",
    extensions: [".mov"],
    outputExtension: "mov",
    matches: (b) => {
      if (b.length < 8) return false;
      const box = b.subarray(4, 8).toString("latin1");
      return box === "ftyp" || box === "moov" || box === "wide" || box === "mdat" || box === "free";
    },
  },
};

const MIME_FORMATS = new Map(Object.entries(FORMATS).map(([format, c]) => [c.mime, format]));
const EXTENSION_FORMATS = new Map(
  Object.entries(FORMATS).flatMap(([format, c]) => c.extensions.map((ext) => [ext, format]))
);

const UNSUPPORTED_MESSAGE = "Format file tidak didukung. Gunakan video MP4, WebM, atau MOV";

const unsupportedType = () => new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE");
const invalidVideo = (message) => new AppError(message, 400, "INVALID_VIDEO");

// Validasi awal di Multer: MIME dan ekstensi harus sama-sama didukung dan menunjuk format yang sama
const isSupportedVideoUpload = (mimeType, originalName) => {
  const fromMime = MIME_FORMATS.get(mimeType);
  const extension = path.extname(originalName || "").toLowerCase();
  return Boolean(fromMime && EXTENSION_FORMATS.get(extension) === fromMime);
};

// Nama asli untuk disimpan di metadata: tanpa path traversal, tanpa karakter kontrol
const sanitizeDisplayName = (originalName) => {
  const base = path.basename(String(originalName || "").replace(/\\/g, "/"));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  return (cleaned || "video").slice(0, 150);
};

// Memeriksa isi buffer video (magic bytes) agar sesuai dengan tipe & ekstensi yang dikirim
const validateVideo = (file, maxBytes = DEFAULT_MAX_VIDEO_SIZE) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw invalidVideo("File video kosong atau tidak valid");
  }

  if (file.buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new AppError(`Ukuran file maksimal ${maxMb} MB`, 413, "FILE_TOO_LARGE");
  }

  const fromMime = MIME_FORMATS.get(file.mimetype);
  const fromExt = EXTENSION_FORMATS.get(path.extname(file.originalname || "").toLowerCase());

  if (!fromMime || !fromExt) {
    throw unsupportedType();
  }

  if (fromMime !== fromExt) {
    throw invalidVideo("Tipe file tidak sesuai dengan ekstensi yang dikirim");
  }

  const detected = Object.keys(FORMATS).find((format) => FORMATS[format].matches(file.buffer));
  if (!detected) {
    throw invalidVideo("Isi file bukan video yang valid");
  }

  // Khusus MOV dan MP4 keduanya dapat memakai ftyp; jika salah satunya cocok dengan MIME yang dikirim
  if (detected !== fromMime && !(fromMime === "quicktime" && detected === "mp4")) {
    throw invalidVideo("Isi file tidak sesuai dengan tipe atau ekstensi yang dikirim");
  }

  return {
    buffer: file.buffer,
    mimeType: FORMATS[fromMime].mime,
    extension: FORMATS[fromMime].outputExtension,
    size: file.buffer.length,
    displayName: sanitizeDisplayName(file.originalname),
  };
};

const assertWithinDurationLimit = (duration, maxDurationSeconds = DEFAULT_MAX_DURATION_SECONDS) => {
  if (typeof duration === "number" && duration > maxDurationSeconds) {
    const maxMinutes = Math.round(maxDurationSeconds / 60);
    throw new AppError(`Durasi video maksimal ${maxMinutes} menit`, 400, "VIDEO_DURATION_EXCEEDED");
  }
};

module.exports = {
  DEFAULT_MAX_VIDEO_SIZE,
  DEFAULT_MAX_DURATION_SECONDS,
  UNSUPPORTED_MESSAGE,
  isSupportedVideoUpload,
  sanitizeDisplayName,
  validateVideo,
  assertWithinDurationLimit,
};

