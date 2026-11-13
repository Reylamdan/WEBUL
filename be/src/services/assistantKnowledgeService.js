
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

const TABLE = "assistant_knowledge";

// TIDAK memakai select("*"). Daftar tidak menyertakan content (bisa sampai 10.000 karakter);
// detail menyertakannya.
const LIST_COLUMNS =
  "id, title, category, keywords, source_label, source_path, status, valid_until, created_by, updated_by, created_at, updated_at";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, content`;

const knowledgeNotFound = () =>
  new AppError("Knowledge tidak ditemukan", 404, "KNOWLEDGE_NOT_FOUND");

// Informasi admin diambil dengan query terpisah ke tabel admins (hanya id + name), bukan join
// PostgREST, supaya tidak bergantung pada nama foreign key dan tidak pernah membawa email/password_hash.
const loadAdminNames = async (rows, context) => {
  const ids = [...new Set(rows.flatMap((row) => [row.created_by, row.updated_by]).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("admins").select("id, name").in("id", ids);
  if (error) throwDbError(`${context}: ambil admin`, error);

  return new Map(data.map((admin) => [admin.id, { id: admin.id, name: admin.name }]));
};

const toAdminRef = (id, admins) => {
  if (!id) return null;
  // Admin sudah dihapus dari tabel admins: tetap kembalikan id-nya, nama tidak diketahui.
  return admins.get(id) ?? { id, name: null };
};

// Keywords selalu dikembalikan sebagai array string. Hanya elemen bertipe string yang dipertahankan;
// elemen lain (angka, null, objek) dibuang, bukan diubah menjadi teks.
const toKeywordArray = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];

// Row database (snake_case) -> response API (camelCase)
// includeContent=false untuk daftar: content tidak pernah ikut keluar di list.
const serializeKnowledge = (row, admins, { includeContent = true } = {}) => {
  const item = {
    id: row.id,
    title: row.title,
    category: row.category,
    keywords: toKeywordArray(row.keywords),
    sourceLabel: row.source_label ?? null,
    sourcePath: row.source_path ?? null,
    status: row.status,
    validUntil: row.valid_until ?? null,
    createdBy: toAdminRef(row.created_by, admins),
    updatedBy: toAdminRef(row.updated_by, admins),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeContent && row.content !== undefined) {
    item.content = row.content;
  }

  return item;
};

const findKnowledgeById = async (id, context) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError(context, error);

  return data;
};

// valid_until bertipe DATE: dibandingkan sebagai tanggal kalender "YYYY-MM-DD"
// tanpa zona waktu atau jam. Hanya format tanggal lengkap yang diterima.
const toDateOnly = (value) => {
  if (typeof value !== "string") return null;

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
};

const sameKeywords = (a, b) => {
  const left = toKeywordArray(a);
  const right = toKeywordArray(b);

  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
};

// Membandingkan input yang sudah tervalidasi dengan row saat ini.
// Hanya field yang BENAR-BENAR berbeda yang masuk ke patch,
// sehingga updated_by/updated_at tidak berubah pada PATCH tanpa perubahan.
const buildPatch = (body, current) => {
  const patch = {};

  if (body.title !== undefined && body.title !== current.title) {
    patch.title = body.title;
  }

  if (body.category !== undefined && body.category !== current.category) {
    patch.category = body.category;
  }

  if (body.content !== undefined && body.content !== current.content) {
    patch.content = body.content;
  }

  if (body.keywords !== undefined && !sameKeywords(body.keywords, current.keywords)) {
    patch.keywords = body.keywords;
  }

  if (
    body.sourceLabel !== undefined &&
    body.sourceLabel !== (current.source_label ?? null)
  ) {
    patch.source_label = body.sourceLabel;
  }

  if (
    body.sourcePath !== undefined &&
    body.sourcePath !== (current.source_path ?? null)
  ) {
    patch.source_path = body.sourcePath;
  }

  if (body.status !== undefined && body.status !== current.status) {
    patch.status = body.status;
  }

  if (
    body.validUntil !== undefined &&
    toDateOnly(body.validUntil) !== toDateOnly(current.valid_until)
  ) {
    patch.valid_until = body.validUntil;
  }

  return patch;
};

module.exports = {
  TABLE,
  LIST_COLUMNS,
  DETAIL_COLUMNS,
  knowledgeNotFound,
  loadAdminNames,
  serializeKnowledge,
  findKnowledgeById,
  buildPatch,
};
