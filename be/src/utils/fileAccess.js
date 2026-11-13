// Akses baca file di Drive: pembentukan URL preview/download dan token berumur pendek untuk admin.
//
// Drive tidak pernah dibuka ke publik. Ada dua jalur baca, keduanya lewat backend:
//   1. PUBLIK  : GET <route publik>/document|attachments/:id  -> hanya data berstatus published.
//   2. ADMIN   : GET /api/files/:token -> token HMAC berumur pendek, dibuat di respons API admin
//                (browser tidak bisa menyertakan header Authorization pada <iframe>/<a href>).
//                Token hanya merujuk ke RECORD (bukan ke file ID); file ditentukan ulang dari
//                database saat dibuka, jadi file yang sudah diganti/dihapus langsung tidak bisa
//                diakses lagi walau token belum kedaluwarsa.
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const FILE_TOKEN_TTL_SECONDS = 10 * 60;
const AUDIENCE = "lia-file-access";
const ISSUER = "universitas-lia-api";

const KINDS = {
  studyProgramDocument: "study_program_document",
  regulationDocument: "regulation_document",
  regulationAttachment: "regulation_attachment",
};

const apiUrl = (path) => `${env.backendPublicUrl}${path}`;

const signFileToken = ({ kind, recordId, attachmentId }) =>
  jwt.sign({ k: kind, r: recordId, ...(attachmentId ? { a: attachmentId } : {}) }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: FILE_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

// Mengembalikan payload, atau null jika token tidak valid/kedaluwarsa/bukan token file.
const verifyFileToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!Object.values(KINDS).includes(payload.k) || typeof payload.r !== "string") return null;
    return { kind: payload.k, recordId: payload.r, attachmentId: payload.a || null };
  } catch {
    return null;
  }
};

// Path publik (tanpa prefix) untuk setiap jenis file.
const PUBLIC_PATHS = {
  [KINDS.studyProgramDocument]: ({ recordId }) => `/api/accreditation/study-programs/${recordId}/document`,
  [KINDS.regulationDocument]: ({ recordId }) => `/api/banpt-regulations/${recordId}/document`,
  [KINDS.regulationAttachment]: ({ recordId, attachmentId }) =>
    `/api/banpt-regulations/${recordId}/attachments/${attachmentId}`,
};

// Membuat { url, downloadUrl, expiresAt } untuk satu file Drive.
//   admin=true  -> URL bertoken (berlaku 10 menit), boleh untuk data draft
//   admin=false -> URL route publik tetap (hanya jalan jika datanya published)
const buildFileLinks = ({ kind, recordId, attachmentId }, { admin }) => {
  if (admin) {
    const preview = apiUrl(`/api/files/${signFileToken({ kind, recordId, attachmentId })}`);
    const download = `${preview}?download=1`;
    return {
      url: preview,
      downloadUrl: download,
      expiresAt: new Date(Date.now() + FILE_TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
  }
  const base = apiUrl(PUBLIC_PATHS[kind]({ recordId, attachmentId }));
  return { url: base, downloadUrl: `${base}?download=1`, expiresAt: null };
};

module.exports = { FILE_TOKEN_TTL_SECONDS, KINDS, signFileToken, verifyFileToken, buildFileLinks };
