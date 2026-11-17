const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("./AppError");

const BUCKET = "news-images";
const CACHE_CONTROL = "31536000"; // satu tahun

// Path selalu dibuat server. Nama file dari pengguna tidak pernah dipakai.
const buildCoverPath = (newsId, extension) =>
  `covers/${newsId}/${crypto.randomUUID()}.${extension}`;

// Gambar agenda acara memakai bucket yang sama dengan cover berita, dipisah lewat prefix "agenda/".
const buildAgendaImagePath = (eventId, extension) =>
  `agenda/${eventId}/${crypto.randomUUID()}.${extension}`;

const buildOrganizationImagePath = (unitId, extension) =>
  `organization/${unitId}/${crypto.randomUUID()}.${extension}`;

const getCoverPublicUrl = (coverPath) => {
  if (!coverPath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
};

const storageError = (context, error) => {
  console.error(
    `[STORAGE] ${context}: ${(error && error.message) || error} (kode: ${(error && error.code) || "-"})`
  );
  return new AppError("Terjadi kesalahan pada penyimpanan gambar", 502, "STORAGE_ERROR");
};

const uploadCoverObject = async (coverPath, buffer, contentType) => {
  const { error } = await supabase.storage.from(BUCKET).upload(coverPath, buffer, {
    contentType,
    cacheControl: CACHE_CONTROL,
    upsert: false,
  });

  if (error) throw storageError("cover: upload", error);
};

const removeCoverObject = async (coverPath) => {
  if (!coverPath) return;

  const { error } = await supabase.storage.from(BUCKET).remove([coverPath]);
  if (error) throw error;
};

const logOrphan = (coverPath, context, error) => {
  console.error(
    `[ORPHAN] ${coverPath} (${context}): ${(error && error.message) || error}`
  );
};

// Penghapusan file bersifat best-effort. Kegagalan tidak boleh mengubah respons
// sukses menjadi error; file yang tertinggal dicatat untuk pembersihan manual.
const removeCoverObjectQuietly = async (coverPath, context) => {
  if (!coverPath) return;

  try {
    await removeCoverObject(coverPath);
  } catch (error) {
    logOrphan(coverPath, context, error);
  }
};

// Ringkasan error provider yang AMAN dicatat: hanya kategori, status HTTP, dan kode pendek.
// Pesan error tidak pernah dipakai karena bisa memuat kredensial.
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,40}$/;

const describeProviderError = (error) => {
  const isObj = error && typeof error === "object";
  const rawStatus = isObj ? Number(error.http_code ?? error.statusCode ?? error.status) : NaN;
  const status = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : null;
  const rawCode = isObj && typeof error.code === "string" ? error.code : "";
  const code = SAFE_CODE.test(rawCode) ? rawCode : null;

  let category = "unknown";
  if (status === 401 || status === 403) category = "auth";
  else if (status === 404) category = "not_found";
  else if (status === 429) category = "rate_limit";
  else if (status >= 500) category = "provider";
  else if (status >= 400) category = "request";

  return `kategori=${category} http=${status ?? "-"} kode=${code ?? "-"}`;
};

module.exports = {
  BUCKET,
  CACHE_CONTROL,
  buildCoverPath,
  buildAgendaImagePath,
  buildOrganizationImagePath,
  getCoverPublicUrl,
  uploadCoverObject,
  removeCoverObject,
  removeCoverObjectQuietly,
  describeProviderError,
};