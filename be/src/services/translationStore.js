const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

// Penyimpanan terjemahan di tabel public.content_translations (struktur diperiksa langsung dari
// database): id, entity_type, entity_id, lang, fields(jsonb), source_hash(sha256 hex),
// provider, created_at, updated_at. UNIQUE(entity_type, entity_id, lang); lang <> 'id'.
//
// Aturan: SATU BARIS = terjemahan yang SUDAH DISETUJUI admin (tidak ada kolom status; pratinjau
// tidak pernah menulis ke tabel ini). Baris dihapus otomatis oleh trigger database saat
// entitas sumber dihapus.

// Nilai entity_type di database. HARUS sama dengan argumen trigger delete_translations_on_delete
// pada tabel terkait, supaya terjemahan ikut terhapus. news = 'news' (dikonfirmasi komentar di
// adminNewsController). Untuk announcement: LIHAT PROGRESS.md — konfirmasi argumen trigger-nya.
const ENTITIES = {
  news: {
    table: "news",
    entityType: "news",
    notFound: "Berita tidak ditemukan",
    notFoundCode: "NEWS_NOT_FOUND",
    itemKey: "news",
  },
  announcement: {
    table: "announcements",
    entityType: "announcement",
    notFound: "Pengumuman tidak ditemukan",
    notFoundCode: "ANNOUNCEMENT_NOT_FOUND",
    itemKey: "announcement",
  },
};

const SUPPORTED_LANGS = ["en"];

// Hash isi sumber (Indonesia). Berubah bila judul/excerpt/isi berubah -> terjemahan lama
// dianggap usang (stale) dan tidak ditampilkan ke publik sampai diterjemahkan ulang.
const computeSourceHash = (row) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify([row.title ?? "", row.excerpt ?? "", row.content_html ?? ""]))
    .digest("hex");

const entityOf = (kind) => {
  const entity = ENTITIES[kind];
  if (!entity) throw new Error(`translationStore: jenis entitas tidak dikenal "${kind}"`);
  return entity;
};

// Memuat sumber (Indonesia) dari tabel aslinya. 404 bila tidak ada.
const loadSource = async (kind, id) => {
  const entity = entityOf(kind);
  const { data, error } = await supabase
    .from(entity.table)
    .select("id, title, excerpt, content_html")
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(`translations: ambil sumber ${entity.table}`, error);
  if (!data) throw new AppError(entity.notFound, 404, entity.notFoundCode);

  return {
    row: data,
    hash: computeSourceHash(data),
    fields: {
      title: { kind: "text", value: data.title },
      excerpt: { kind: "text", value: data.excerpt },
      contentHtml: { kind: "html", value: data.content_html },
    },
  };
};

const serializeTranslation = (row, currentHash) => ({
  lang: row.lang,
  fields: row.fields,
  provider: row.provider,
  sourceHash: row.source_hash,
  stale: row.source_hash !== currentHash,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const listTranslations = async (kind, id) => {
  const entity = entityOf(kind);
  const source = await loadSource(kind, id);
  const { data, error } = await supabase
    .from("content_translations")
    .select("lang, fields, provider, source_hash, created_at, updated_at")
    .eq("entity_type", entity.entityType)
    .eq("entity_id", id)
    .order("lang", { ascending: true });
  if (error) throwDbError("translations: daftar", error);
  return { sourceHash: source.hash, items: data.map((row) => serializeTranslation(row, source.hash)) };
};

// Menyimpan (upsert) terjemahan yang sudah disetujui admin.
// expectedHash = hash sumber saat pratinjau dibuat; bila sumber sudah berubah -> 409.
const saveTranslation = async (kind, id, lang, { fields, expectedHash, provider }) => {
  const entity = entityOf(kind);
  const source = await loadSource(kind, id);

  if (expectedHash !== source.hash) {
    throw new AppError(
      "Konten sumber berubah sejak pratinjau dibuat. Buat pratinjau terjemahan baru.",
      409,
      "SOURCE_CHANGED"
    );
  }

  const { data, error } = await supabase
    .from("content_translations")
    .upsert(
      {
        entity_type: entity.entityType,
        entity_id: id,
        lang,
        fields,
        source_hash: source.hash,
        provider,
      },
      { onConflict: "entity_type,entity_id,lang" }
    )
    .select("lang, fields, provider, source_hash, created_at, updated_at")
    .single();
  if (error) throwDbError("translations: simpan", error);

  return serializeTranslation(data, source.hash);
};

const deleteTranslation = async (kind, id, lang) => {
  const entity = entityOf(kind);
  const { data, error } = await supabase
    .from("content_translations")
    .delete()
    .eq("entity_type", entity.entityType)
    .eq("entity_id", id)
    .eq("lang", lang)
    .select("id");
  if (error) throwDbError("translations: hapus", error);
  if (!data || data.length === 0) {
    throw new AppError("Terjemahan tidak ditemukan", 404, "TRANSLATION_NOT_FOUND");
  }
};

// ---------------------------------------------------------------------
// Penggabungan ke respons PUBLIK
// ---------------------------------------------------------------------
// items: objek hasil serializePublic* (punya id, title, excerpt, dan kadang contentHtml).
// Mengembalikan salinan dengan teks terjemahan bila ada DAN masih sesuai sumber saat ini.
// Selain itu: bahasa Indonesia apa adanya. Setiap item diberi `translated` true/false.
const overlayPublicItems = async (kind, lang, items) => {
  const entity = entityOf(kind);
  const ids = items.map((item) => item.id).filter(Boolean);
  const result = items.map((item) => ({ ...item, translated: false }));
  if (ids.length === 0) return result;

  const { data: rows, error } = await supabase
    .from("content_translations")
    .select("entity_id, fields, source_hash")
    .eq("entity_type", entity.entityType)
    .eq("lang", lang)
    .in("entity_id", ids);
  if (error) throwDbError("translations: ambil untuk publik", error);
  if (!rows || rows.length === 0) return result;

  // Verifikasi terhadap sumber saat ini (hanya untuk id yang punya terjemahan).
  const translatedIds = rows.map((row) => row.entity_id);
  const { data: sources, error: sourceError } = await supabase
    .from(entity.table)
    .select("id, title, excerpt, content_html")
    .in("id", translatedIds);
  if (sourceError) throwDbError("translations: verifikasi sumber", sourceError);

  const hashById = new Map((sources || []).map((s) => [s.id, computeSourceHash(s)]));
  const rowById = new Map(rows.map((row) => [row.entity_id, row]));

  return result.map((item) => {
    const row = rowById.get(item.id);
    if (!row || hashById.get(item.id) !== row.source_hash) return item; // tidak ada / usang -> Indonesia
    const f = row.fields || {};
    const next = { ...item, translated: true };
    if (typeof f.title === "string" && f.title) next.title = f.title;
    if (typeof f.excerpt === "string" && f.excerpt) next.excerpt = f.excerpt;
    if (item.contentHtml !== undefined && typeof f.contentHtml === "string" && f.contentHtml) {
      next.contentHtml = f.contentHtml;
    }
    return next;
  });
};

module.exports = {
  ENTITIES,
  SUPPORTED_LANGS,
  computeSourceHash,
  loadSource,
  listTranslations,
  saveTranslation,
  deleteTranslation,
  overlayPublicItems,
};
