const { z } = require("zod");
const { toPlainText, sanitizeArticleHtml } = require("../utils/sanitizeHtml");
const { htmlToText } = require("../utils/excerpt");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD_VALUE_MAX = 200000; // sama dengan batas isi berita/pengumuman
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const MAX_FIELDS = 20;

// Batas mengikuti validator berita/pengumuman
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const EXCERPT_MAX = 500;

const ENTITY_TYPES = ["news", "announcement"];
const LANGS = ["en"];
const SHA256_HEX = /^[0-9a-f]{64}$/;

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const fieldSchema = z.strictObject({
  kind: z.enum(["text", "html"], { error: "kind harus text atau html" }),
  value: z
    .string({ error: "value harus berupa teks" })
    .max(FIELD_VALUE_MAX, `Teks maksimal ${FIELD_VALUE_MAX.toLocaleString("id-ID")} karakter`),
});

// ---------- POST /preview ----------
// Dua cara memakai endpoint preview (pilih salah satu):
//   1. { entityType, entityId }  -> terjemahkan berita/pengumuman yang sudah ada di database
//   2. { fields: { nama: { kind, value } } } -> teks apa pun (halaman baru, konten lain)
const previewSchema = z
  .strictObject({
    targetLang: z.enum(LANGS, { error: "Bahasa tujuan yang didukung: en" }).default("en"),
    entityType: z.enum(ENTITY_TYPES, { error: "entityType harus news atau announcement" }).optional(),
    entityId: z.string().regex(UUID_PATTERN, "entityId tidak valid").optional(),
    fields: z
      .record(z.string().regex(FIELD_NAME_PATTERN, "Nama field tidak valid"), fieldSchema)
      .refine((obj) => Object.keys(obj).length <= MAX_FIELDS, `Maksimal ${MAX_FIELDS} field`)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const byEntity = data.entityType !== undefined || data.entityId !== undefined;
    const byFields = data.fields !== undefined;
    if (byEntity === byFields) {
      ctx.addIssue({
        code: "custom",
        message: "Kirim salah satu: (entityType + entityId) atau fields",
        path: [],
      });
      return;
    }
    if (byEntity && (data.entityType === undefined || data.entityId === undefined)) {
      ctx.addIssue({ code: "custom", message: "entityType dan entityId harus dikirim bersamaan", path: [] });
    }
  });

// ---------- Params: /:entityType/:entityId[/:lang] ----------
const entityParamsSchema = z.object({
  entityType: z.enum(ENTITY_TYPES, { error: "entityType harus news atau announcement" }),
  entityId: z.string().regex(UUID_PATTERN, "entityId tidak valid"),
});

const entityLangParamsSchema = entityParamsSchema.extend({
  lang: z.enum(LANGS, { error: "Bahasa yang didukung: en" }),
});

// ---------- PUT /:entityType/:entityId/:lang (setujui & simpan) ----------
// Admin boleh menyunting hasil terjemahan AI sebelum menyimpan. Server tetap membersihkan ulang semuanya.
const titleField = z
  .string({ error: "Judul terjemahan wajib diisi" })
  .transform(toPlainText)
  .pipe(
    z
      .string()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

const excerptField = z
  .string({ error: "Excerpt harus berupa teks" })
  .transform(toPlainText)
  .pipe(z.string().max(EXCERPT_MAX, `Excerpt maksimal ${EXCERPT_MAX} karakter`));

const contentHtmlField = z
  .string({ error: "Isi terjemahan harus berupa teks" })
  .max(FIELD_VALUE_MAX, `Isi maksimal ${FIELD_VALUE_MAX.toLocaleString("id-ID")} karakter`)
  .transform(sanitizeArticleHtml)
  .pipe(
    z
      .string()
      .max(FIELD_VALUE_MAX, "Isi terlalu panjang setelah dibersihkan")
      .refine((html) => htmlToText(html).length > 0, "Isi terjemahan tidak memiliki konten yang layak")
  );

const saveTranslationSchema = strictBody({
  fields: strictBody({
    title: titleField,
    excerpt: excerptField.optional(),
    contentHtml: contentHtmlField.optional(),
  }),
  // Hash sumber dari respons preview. Server menolak (409) bila sumber sudah berubah.
  sourceHash: z.string({ error: "sourceHash wajib diisi" }).regex(SHA256_HEX, "sourceHash tidak valid"),
  // Model AI yang dipakai (dari respons preview), mis. "openai/gpt-oss-120b" (Groq) atau
  // "gemini-...-flash" (terjemahan lama). Kosong = disunting/ditulis manual.
  model: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._\-/]*$/i, "model tidak valid")
    .max(64)
    .optional(),
});

module.exports = {
  previewSchema,
  entityParamsSchema,
  entityLangParamsSchema,
  saveTranslationSchema,
  ENTITY_TYPES,
};
