// Preview & download file dokumen yang disimpan di Google Drive.
// Drive tidak pernah dibuka ke publik: backend menarik file dengan Service Account lalu
// mengalirkannya (streaming) ke klien, setelah otorisasi diperiksa.
//
//   publik : GET /api/accreditation/study-programs/:id/document
//            GET /api/banpt-regulations/:id/document
//            GET /api/banpt-regulations/:id/attachments/:attachmentId
//            -> hanya data berstatus published (selain itu 404)
//   admin  : GET /api/files/:token  -> token berumur pendek dari respons API admin
//
// Tambahkan ?download=1 untuk memaksa unduh; tanpa itu file ditampilkan inline (preview).
const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const drive = require("../services/googleDriveService");
const accreditationService = require("../services/accreditationService");
const regulationService = require("../services/banptRegulationService");
const { KINDS, verifyFileToken } = require("../utils/fileAccess");

// Hanya tipe ini yang boleh tampil inline. Tipe lain selalu diunduh.
const INLINE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const SINGLE_RANGE = /^bytes=\d*-\d*$/;

const wantsDownload = (query) => ["1", "true"].includes(String((query && query.download) || "").toLowerCase());

// Content-Disposition aman: fallback ASCII + filename* (RFC 5987) untuk nama unicode.
const contentDisposition = (type, fileName) => {
  const clean = String(fileName || "dokumen").replace(/[\r\n"\\/]/g, "_");
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
};

// Helmet melarang file ini dibingkai & dimuat lintas origin. Preview oleh frontend (iframe/embed)
// butuh izin khusus, tetapi HANYA untuk origin frontend yang terdaftar.
const allowFrontendEmbedding = (res) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  const ancestors = ["'self'", ...env.frontendOrigins].join(" ");
  res.setHeader("Content-Security-Policy", `frame-ancestors ${ancestors}`);
};

// ETag diturunkan dari file ID Drive lewat hash (ID mentah tidak dibocorkan ke klien). File diganti ->
// ID Drive baru -> ETag berubah, jadi cache klien otomatis tidak dipakai lagi.
const etagFor = (driveFileId) => `"${crypto.createHash("sha256").update(String(driveFileId)).digest("hex").slice(0, 32)}"`;

const matchesEtag = (header, etag) =>
  String(header || "")
    .split(",")
    .some((candidate) => candidate.trim().replace(/^W\//, "") === etag);

const streamDriveFile = async (req, res, file, { download, cacheControl }) => {
  if (!drive.isConfigured()) throw drive.notConfigured();

  const inline = !download && INLINE_TYPES.has(file.mimeType);
  const etag = etagFor(file.driveFileId);

  // Header ini hanya dipasang pada respons SUKSES (200/206/304). Dipasang sebelum unduhan Drive berhasil
  // akan membuat respons error JSON ikut berlabel application/pdf + attachment.
  const applySuccessHeaders = () => {
    allowFrontendEmbedding(res);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", INLINE_TYPES.has(file.mimeType) ? file.mimeType : "application/octet-stream");
    res.setHeader("Content-Disposition", contentDisposition(inline ? "inline" : "attachment", file.fileName));
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("ETag", etag);
    res.setHeader("Accept-Ranges", "bytes");
  };

  if (matchesEtag(req.headers["if-none-match"], etag)) {
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", cacheControl);
    return res.status(304).end();
  }

  if (req.method === "HEAD") {
    applySuccessHeaders();
    if (Number.isFinite(file.size)) res.setHeader("Content-Length", String(file.size));
    return res.status(200).end();
  }

  const range = SINGLE_RANGE.test(String(req.headers.range || "")) ? req.headers.range : undefined;
  const abort = new AbortController();
  // Klien menutup koneksi sebelum selesai -> hentikan tarikan dari Drive.
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });

  let upstream;
  try {
    upstream = await drive.downloadFile(file.driveFileId, { range, signal: abort.signal });
  } catch (error) {
    if (abort.signal.aborted) return undefined;
    if (error && error.status === 404) {
      console.error(`[STORAGE] file Drive tidak ditemukan: ${file.driveFileId}`);
      throw new AppError("File tidak ditemukan di penyimpanan", 404, "FILE_NOT_FOUND");
    }
    if (error && error.status === 416) {
      if (Number.isFinite(file.size)) res.setHeader("Content-Range", `bytes */${file.size}`);
      throw new AppError("Rentang file tidak valid", 416, "RANGE_NOT_SATISFIABLE");
    }
    if (error instanceof AppError) throw error;
    console.error(`[STORAGE] Drive unduh gagal: ${(error && error.message) || error}`);
    throw new AppError("Terjadi kesalahan pada penyimpanan dokumen", 502, "STORAGE_ERROR");
  }

  applySuccessHeaders();
  res.status(upstream.status === 206 ? 206 : 200);
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  try {
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    // Header sudah terkirim: tidak bisa mengirim JSON error. Koneksi diputus & dicatat.
    if (!abort.signal.aborted) console.error(`[STORAGE] streaming terputus: ${(error && error.message) || error}`);
    res.destroy();
  }
  return undefined;
};

const PUBLIC_CACHE = "public, no-cache"; // boleh disimpan, tetapi selalu divalidasi ulang (ETag)
const PRIVATE_CACHE = "private, no-store";

// ---------- PUBLIK ----------
const publicStudyProgramDocument = async (req, res) => {
  const entity = accreditationService.ENTITIES.studyProgram;
  const file = await accreditationService.getDocumentFile(entity, req.validated.params.id, { publishedOnly: true });
  return streamDriveFile(req, res, file, { download: wantsDownload(req.query), cacheControl: PUBLIC_CACHE });
};

const publicRegulationDocument = async (req, res) => {
  const file = await regulationService.getDriveFile(req.validated.params.id, null, { published: true });
  return streamDriveFile(req, res, file, { download: wantsDownload(req.query), cacheControl: PUBLIC_CACHE });
};

const publicRegulationAttachment = async (req, res) => {
  const { id, attachmentId } = req.validated.params;
  const file = await regulationService.getDriveFile(id, attachmentId, { published: true });
  return streamDriveFile(req, res, file, { download: wantsDownload(req.query), cacheControl: PUBLIC_CACHE });
};

// ---------- ADMIN (token) ----------
const resolveByToken = (payload) => {
  if (payload.kind === KINDS.studyProgramDocument) {
    return accreditationService.getDocumentFile(accreditationService.ENTITIES.studyProgram, payload.recordId, {
      publishedOnly: false,
    });
  }
  if (payload.kind === KINDS.regulationDocument) {
    return regulationService.getDriveFile(payload.recordId, null, { published: false });
  }
  return regulationService.getDriveFile(payload.recordId, payload.attachmentId, { published: false });
};

const adminFileByToken = async (req, res) => {
  const payload = verifyFileToken(req.params.token);
  // Pesan sama untuk token rusak/kedaluwarsa agar tidak membantu penebakan.
  if (!payload) throw new AppError("Tautan file tidak valid atau sudah kedaluwarsa", 403, "FILE_LINK_INVALID");
  const file = await resolveByToken(payload);
  return streamDriveFile(req, res, file, { download: wantsDownload(req.query), cacheControl: PRIVATE_CACHE });
};

module.exports = {
  publicStudyProgramDocument,
  publicRegulationDocument,
  publicRegulationAttachment,
  adminFileByToken,
};
