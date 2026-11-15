
const path = require("path");
const { unzipSync } = require("fflate");
const AppError = require("./AppError");

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB

const FORMATS = {
  pdf: {
    mime: "application/pdf",
    extensions: [".pdf"],
    outputExtension: "pdf",
    matches: (buffer) =>
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: [".docx"],
    outputExtension: "docx",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: [".xlsx"],
    outputExtension: "xlsx",
  },
};

const MIME_FORMATS = new Map(
  Object.entries(FORMATS).map(([format, config]) => [config.mime, format])
);

const EXTENSION_FORMATS = new Map(
  Object.entries(FORMATS).flatMap(([format, config]) =>
    config.extensions.map((extension) => [extension, format])
  )
);

const UNSUPPORTED_MESSAGE = "Format file tidak didukung. Gunakan PDF, DOCX, atau XLSX";

const unsupportedType = () =>
  new AppError(UNSUPPORTED_MESSAGE, 415, "UNSUPPORTED_FILE_TYPE");

const isSupportedArchiveUpload = (mimeType, originalName) => {
  const fromMime = MIME_FORMATS.get(mimeType);
  const extension = path.extname(originalName || "").toLowerCase();

  return Boolean(fromMime && EXTENSION_FORMATS.get(extension) === fromMime);
};

const sanitizeDisplayName = (originalName) => {
  const base = path.basename(String(originalName || "").replace(/\\/g, "/"));

  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();

  return (cleaned || "dokumen").slice(0, 150);
};

// Memeriksa metadata ZIP sebelum proses ekstraksi.
const validateZipMetadata = (buffer) => {
  const minimumOffset = Math.max(0, buffer.length - 65557);
  let endOffset = -1;

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset < 0) {
    throw new AppError("Struktur dokumen Office tidak valid", 400, "INVALID_DOCUMENT");
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);

  if (
    entryCount === 0 ||
    entryCount > 1000 ||
    centralDirectoryOffset + centralDirectorySize > endOffset
  ) {
    throw new AppError("Struktur dokumen Office tidak valid", 400, "INVALID_DOCUMENT");
  }

  let offset = centralDirectoryOffset;
  let totalUncompressedSize = 0;

  for (let index = 0; index < entryCount; index++) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new AppError("Struktur dokumen Office tidak valid", 400, "INVALID_DOCUMENT");
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    if (uncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      throw new AppError("Ukuran hasil ekstraksi dokumen terlalu besar", 413, "FILE_TOO_LARGE");
    }

    totalUncompressedSize += uncompressedSize;

    if (
      totalUncompressedSize > MAX_UNCOMPRESSED_SIZE ||
      (uncompressedSize > 0 && compressedSize === 0) ||
      (compressedSize > 0 && uncompressedSize / compressedSize > 100)
    ) {
      throw new AppError("Struktur atau ukuran kompresi dokumen tidak aman", 400, "INVALID_DOCUMENT");
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  if (offset > centralDirectoryOffset + centralDirectorySize) {
    throw new AppError("Struktur dokumen Office tidak valid", 400, "INVALID_DOCUMENT");
  }
};

const validateOfficeDocument = (buffer, format) => {
  try {
    validateZipMetadata(buffer);

    const entries = unzipSync(buffer);
    const contentTypes = entries["[Content_Types].xml"];

    if (!contentTypes) {
      throw new Error("Missing content types");
    }

    const contentTypesText = Buffer.from(contentTypes).toString("utf8");

    if (format === "docx") {
      const document = entries["word/document.xml"];

      if (
        !document ||
        !contentTypesText.includes("wordprocessingml.document.main+xml")
      ) {
        throw new Error("Invalid DOCX package");
      }
    }

    if (format === "xlsx") {
      const workbook = entries["xl/workbook.xml"];

      if (
        !workbook ||
        !contentTypesText.includes("spreadsheetml.sheet.main+xml")
      ) {
        throw new Error("Invalid XLSX package");
      }
    }

    const extractedSize = Object.values(entries).reduce(
      (total, entry) => total + entry.length,
      0
    );

    if (extractedSize > MAX_UNCOMPRESSED_SIZE) {
      throw new AppError("Ukuran hasil ekstraksi dokumen terlalu besar", 413, "FILE_TOO_LARGE");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      "Isi dokumen Office tidak valid atau rusak",
      400,
      "INVALID_DOCUMENT"
    );
  }
};

const validateArchiveDocument = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError("File dokumen kosong atau tidak valid", 400, "INVALID_DOCUMENT");
  }

  if (file.buffer.length > MAX_DOCUMENT_SIZE) {
    throw new AppError("Ukuran file maksimal 20 MB", 413, "FILE_TOO_LARGE");
  }

  const fromMime = MIME_FORMATS.get(file.mimetype);
  const fromExt = EXTENSION_FORMATS.get(
    path.extname(file.originalname || "").toLowerCase()
  );

  if (!fromMime || !fromExt) throw unsupportedType();

  if (fromMime !== fromExt) {
    throw new AppError(
      "Tipe file tidak sesuai dengan ekstensi yang dikirim",
      400,
      "INVALID_DOCUMENT"
    );
  }

  if (fromMime === "pdf") {
    if (!FORMATS.pdf.matches(file.buffer)) {
      throw new AppError("Isi file bukan PDF yang valid", 400, "INVALID_DOCUMENT");
    }
  } else {
    validateOfficeDocument(file.buffer, fromMime);
  }

  return {
    buffer: file.buffer,
    mimeType: FORMATS[fromMime].mime,
    extension: FORMATS[fromMime].outputExtension,
    size: file.buffer.length,
    displayName: sanitizeDisplayName(file.originalname),
  };
};

module.exports = {
  MAX_DOCUMENT_SIZE,
  UNSUPPORTED_MESSAGE,
  isSupportedArchiveUpload,
  sanitizeDisplayName,
  validateArchiveDocument,
};
