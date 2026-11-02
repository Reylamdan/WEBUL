const path = require("path");
const sharp = require("sharp");
const AppError = require("./AppError");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 8000;
const MAX_PIXELS = 40_000_000;

// Format yang didukung. Ekstensi keluaran selalu mengikuti format ASLI yang sudah
// diverifikasi Sharp, bukan nama file dari pengguna.
const FORMATS = {
  jpeg: { mime: "image/jpeg", extensions: [".jpg", ".jpeg"], outputExtension: "jpg" },
  png: { mime: "image/png", extensions: [".png"], outputExtension: "png" },
  webp: { mime: "image/webp", extensions: [".webp"], outputExtension: "webp" },
};

// MIME dan ekstensi dipetakan terpisah agar keduanya harus menunjuk format yang sama.
const MIME_FORMATS = new Map(
  Object.entries(FORMATS).map(([format, config]) => [config.mime, format])
);
const EXTENSION_FORMATS = new Map(
  Object.entries(FORMATS).flatMap(([format, config]) =>
    config.extensions.map((extension) => [extension, format])
  )
);

const unsupportedType = () =>
  new AppError(
    "Format file tidak didukung. Gunakan gambar JPEG, PNG, atau WebP",
    415,
    "UNSUPPORTED_FILE_TYPE"
  );

const invalidImage = (message) => new AppError(message, 400, "INVALID_IMAGE");

// Validasi awal di Multer: MIME dan ekstensi harus sama-sama didukung dan cocok.
// Isi file sebenarnya tetap diverifikasi Sharp di validateAndReencode().
const isSupportedUpload = (mimeType, originalName) => {
  const formatFromMime = MIME_FORMATS.get(mimeType);
  const extension = path.extname(originalName || "").toLowerCase();
  return Boolean(formatFromMime && EXTENSION_FORMATS.get(extension) === formatFromMime);
};

// Dipisah agar batas dimensi/piksel/animation bisa diuji tanpa membuat gambar raksasa.
const assertWithinLimits = (metadata) => {
  const { format, width, height, pages } = metadata || {};

  if (!Object.prototype.hasOwnProperty.call(FORMATS, format)) throw unsupportedType();

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw invalidImage("Dimensi gambar tidak valid");
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw invalidImage(`Dimensi gambar maksimal ${MAX_DIMENSION} px per sisi`);
  }

  if (width * height > MAX_PIXELS) {
    throw invalidImage("Ukuran gambar maksimal 40 megapixel");
  }

  // GIF dan WebP dapat berisi beberapa frame. Format GIF sudah ditolak lebih awal;
  // pemeriksaan ini memastikan WebP animasi juga tidak lolos. Beberapa decoder
  // mungkin tidak mengisi pages, tapi kita hanya membaca metadata statis tanpa animated:true.
  if (Number.isInteger(pages) && pages > 1) {
    throw invalidImage("Gambar animasi tidak didukung");
  }

  return format;
};

// Memvalidasi isi file dengan Sharp, lalu me-reencode memakai format aslinya.
// Tanpa .withMetadata(), EXIF/GPS tidak ikut ke hasil. .rotate() menerapkan orientasi.
const validateAndReencode = async (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw invalidImage("File gambar kosong atau tidak valid");
  }

  let metadata;
  try {
    metadata = await sharp(file.buffer, {
      limitInputPixels: MAX_PIXELS,
      failOn: "error",
    }).metadata();
  } catch {
    throw invalidImage("File bukan gambar yang valid");
  }

  const actualFormat = assertWithinLimits(metadata);

  const formatFromMime = MIME_FORMATS.get(file.mimetype);
  if (formatFromMime !== actualFormat) {
    throw invalidImage("Isi file tidak sesuai dengan tipe atau ekstensi yang dikirim");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (EXTENSION_FORMATS.get(extension) !== actualFormat) {
    throw invalidImage("Isi file tidak sesuai dengan ekstensi yang dikirim");
  }

  let pipeline = sharp(file.buffer, {
    limitInputPixels: MAX_PIXELS,
    failOn: "error",
  }).rotate(); // menerapkan orientasi EXIF, tanpa resize

  if (actualFormat === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 90 });
  } else if (actualFormat === "webp") {
    pipeline = pipeline.webp({ quality: 90 });
  } else {
    pipeline = pipeline.png(); // PNG memakai pengaturan default Sharp
  }

  try {
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      mimeType: FORMATS[actualFormat].mime,
      extension: FORMATS[actualFormat].outputExtension,
      width: info.width,
      height: info.height,
    };
  } catch {
    throw invalidImage("Gambar tidak dapat diproses");
  }
};

module.exports = {
  MAX_FILE_SIZE,
  MAX_DIMENSION,
  MAX_PIXELS,
  isSupportedUpload,
  assertWithinLimits,
  validateAndReencode,
};
