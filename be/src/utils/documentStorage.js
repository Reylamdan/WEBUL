const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("./AppError");

// Bucket PRIVAT. Dokumen tidak pernah diakses lewat URL publik permanen;
// pengunjung hanya mendapat signed URL berumur pendek untuk data yang sudah published.
const BUCKET = "accreditation-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 jam

// Path selalu dibuat server. Nama file dari pengguna tidak pernah dipakai.
const buildDocumentPath = (folder, recordId, extension) =>
  `${folder}/${recordId}/${crypto.randomUUID()}.${extension}`;

const storageError = (context, error) => {
  console.error(
    `[STORAGE] ${context}: ${(error && error.message) || error} (kode: ${(error && error.code) || "-"})`
  );
  return new AppError("Terjadi kesalahan pada penyimpanan dokumen", 502, "STORAGE_ERROR");
};

const uploadDocumentObject = async (documentPath, buffer, contentType) => {
  const { error } = await supabase.storage.from(BUCKET).upload(documentPath, buffer, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw storageError("dokumen akreditasi: upload", error);
};

const removeDocumentObject = async (documentPath) => {
  if (!documentPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([documentPath]);
  if (error) throw error;
};

// Penghapusan file bersifat best-effort: kegagalan tidak mengubah respons sukses menjadi error.
// File yang tertinggal dicatat sebagai [ORPHAN] untuk dibersihkan manual.
const removeDocumentObjectQuietly = async (documentPath, context) => {
  if (!documentPath) return;
  try {
    await removeDocumentObject(documentPath);
  } catch (error) {
    console.error(
      `[ORPHAN] ${BUCKET}/${documentPath} (${context}): ${(error && error.message) || error}`
    );
  }
};

// Mengembalikan { url, expiresAt } atau null. Gagal membuat signed URL tidak menggagalkan request.
const createDocumentSignedUrl = async (documentPath) => {
  if (!documentPath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documentPath, SIGNED_URL_TTL_SECONDS);
    if (error || !data || !data.signedUrl) throw error || new Error("signedUrl kosong");
    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    };
  } catch (error) {
    console.error(
      `[STORAGE] signed URL gagal untuk ${documentPath}: ${(error && error.message) || error}`
    );
    return null;
  }
};

module.exports = {
  BUCKET,
  SIGNED_URL_TTL_SECONDS,
  buildDocumentPath,
  uploadDocumentObject,
  removeDocumentObject,
  removeDocumentObjectQuietly,
  createDocumentSignedUrl,
};
