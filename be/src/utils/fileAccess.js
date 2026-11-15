
// Akses baca file di Google Drive:
// - URL preview/download publik.
// - Token sementara untuk akses file admin.
//
// Google Drive tidak pernah dibuka langsung ke publik.
// Semua file diakses melalui backend.
//
// PUBLIK:
// GET /api/<route-publik>/document
// Hanya file milik data berstatus published.
//
// ADMIN:
// GET /api/files/:token
// Token HMAC berumur pendek dibuat melalui respons API admin.
// Token hanya merujuk ke RECORD, bukan ID file Google Drive.
// File selalu ditentukan ulang dari database saat diakses,
// sehingga file yang sudah diganti atau dihapus tidak bisa
// diakses lagi menggunakan token lama.

const jwt = require("jsonwebtoken");
const env = require("../config/env");

const FILE_TOKEN_TTL_SECONDS = 10 * 60;
const AUDIENCE = "lia-file-access";
const ISSUER = "universitas-lia-api";

const KINDS = {
  studyProgramDocument: "study_program_document",
  regulationDocument: "regulation_document",
  regulationAttachment: "regulation_attachment",
  lpmArchiveDocument: "lpm_archive_document",
};

const apiUrl = (path) => `${env.backendPublicUrl}${path}`;

// Membuat token akses file admin.
const signFileToken = ({ kind, recordId, attachmentId }) =>
  jwt.sign(
    {
      k: kind,
      r: recordId,
      ...(attachmentId ? { a: attachmentId } : {}),
    },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: FILE_TOKEN_TTL_SECONDS,
      issuer: ISSUER,
      audience: AUDIENCE,
    }
  );

// Memverifikasi token.
// Mengembalikan payload atau null jika token tidak valid/kedaluwarsa.
const verifyFileToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (
      !Object.values(KINDS).includes(payload.k) ||
      typeof payload.r !== "string"
    ) {
      return null;
    }

    return {
      kind: payload.k,
      recordId: payload.r,
      attachmentId: payload.a || null,
    };
  } catch {
    return null;
  }
};

// Path publik untuk setiap jenis file.
const PUBLIC_PATHS = {
  [KINDS.studyProgramDocument]: ({ recordId }) =>
    `/api/accreditation/study-programs/${recordId}/document`,

  [KINDS.regulationDocument]: ({ recordId }) =>
    `/api/banpt-regulations/${recordId}/document`,

  [KINDS.regulationAttachment]: ({ recordId, attachmentId }) =>
    `/api/banpt-regulations/${recordId}/attachments/${attachmentId}`,

  [KINDS.lpmArchiveDocument]: ({ recordId }) =>
    `/api/lpm-archives/${recordId}/document`,
};

// Membuat URL preview, download, dan waktu kedaluwarsa.
//
// admin=true:
//   Menggunakan token sementara.
//   Bisa digunakan untuk arsip draft maupun published.
//
// admin=false:
//   Menggunakan route publik.
//   Hanya dapat diakses jika data sudah published.
const buildFileLinks = ({ kind, recordId, attachmentId }, { admin }) => {
  if (!KINDS[kind] && !Object.values(KINDS).includes(kind)) {
    throw new Error("Jenis file tidak dikenal");
  }

  if (admin) {
    const preview = apiUrl(
      `/api/files/${signFileToken({ kind, recordId, attachmentId })}`
    );

    return {
      url: preview,
      downloadUrl: `${preview}?download=1`,
      expiresAt: new Date(
        Date.now() + FILE_TOKEN_TTL_SECONDS * 1000
      ).toISOString(),
    };
  }

  const publicPath = PUBLIC_PATHS[kind];

  if (!publicPath) {
    throw new Error("Route publik untuk jenis file tidak tersedia");
  }

  const base = apiUrl(publicPath({ recordId, attachmentId }));

  return {
    url: base,
    downloadUrl: `${base}?download=1`,
    expiresAt: null,
  };
};

module.exports = {
  FILE_TOKEN_TTL_SECONDS,
  KINDS,
  signFileToken,
  verifyFileToken,
  buildFileLinks,
};
