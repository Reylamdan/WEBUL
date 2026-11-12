const { z } = require("zod");

// Batas mengikuti keputusan desain Assistant Knowledge.
const TITLE_MAX = 200;
const CATEGORY_MAX = 60;
const CONTENT_MAX = 10000;
const KEYWORDS_MAX_ITEMS = 20;
const KEYWORD_MAX_LENGTH = 50;
const SOURCE_LABEL_MAX = 200;
const SOURCE_PATH_MAX = 500;
const SEARCH_MAX = 100;
// Pagar kasar untuk jumlah item MENTAH sebelum dirapikan/dedup (body sudah dibatasi 1 MB oleh express.json).
// Ini berbeda dari batas 20 keyword unik yang diperiksa setelah normalisasi.
const KEYWORDS_RAW_MAX_ITEMS = 200;

const STATUSES = ["draft", "published"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Field di luar skema (id, createdBy, updatedBy, createdAt, ...) ditolak supaya klien tidak bisa
// menyisipkan data yang seharusnya diatur server.
const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

// ---------- Pembersih teks ----------
// Karakter kontrol (kecuali \t \n \r) dibuang. Karakter khusus lain (kutip, koma, kurung, +, /, dst.)
// TIDAK diubah: data disimpan apa adanya sebagai nilai JSON, bukan lewat filter.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

// Satu baris: semua spasi/tab/newline dirapikan menjadi satu spasi. Kapitalisasi dipertahankan.
const singleLine = (value) => value.normalize("NFC").replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();

// Banyak baris (content): newline dipertahankan agar paragraf/daftar tidak rusak.
const multiLine = (value) =>
  value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .trim();

// ---------- Field ----------
const titleField = z
  .string({ error: "Judul wajib diisi" })
  .transform(singleLine)
  .pipe(
    z
      .string()
      .min(1, "Judul wajib diisi")
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

const categoryField = z
  .string({ error: "Kategori wajib diisi" })
  .transform(singleLine)
  .pipe(
    z
      .string()
      .min(1, "Kategori wajib diisi")
      .max(CATEGORY_MAX, `Kategori maksimal ${CATEGORY_MAX} karakter`)
  );

const contentField = z
  .string({ error: "Isi knowledge wajib diisi" })
  .transform(multiLine)
  .pipe(
    z
      .string()
      .min(1, "Isi knowledge wajib diisi")
      .max(CONTENT_MAX, `Isi knowledge maksimal ${CONTENT_MAX.toLocaleString("id-ID")} karakter`)
  );

// Keywords: tiap item dirapikan (spasi) dan diubah ke huruf kecil supaya "UKT", "ukt", dan " Ukt "
// dianggap sama, lalu duplikat dibuang (urutan kemunculan pertama dipertahankan). Item kosong
// setelah dirapikan dibuang. Batas jumlah (20) dihitung SETELAH dedup.
// Tidak dikirim / null -> [].
const keywordsField = z
  .union([z.null(), z.array(z.string({ error: "Setiap keyword harus berupa teks" }), { error: "Keywords harus berupa daftar teks" })])
  .transform((value) => value ?? [])
  .superRefine((items, ctx) => {
    if (items.length > KEYWORDS_RAW_MAX_ITEMS) {
      ctx.addIssue({ code: "custom", message: `Daftar keywords yang dikirim terlalu panjang (lebih dari ${KEYWORDS_RAW_MAX_ITEMS} item mentah, sebelum dirapikan dan dibuang duplikatnya). Kirim maksimal ${KEYWORDS_MAX_ITEMS} keyword unik.` });
    }
  })
  .transform((items) => {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const normalized = singleLine(item).toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  })
  .superRefine((items, ctx) => {
    if (items.length > KEYWORDS_MAX_ITEMS) {
      ctx.addIssue({ code: "custom", message: `Keywords maksimal ${KEYWORDS_MAX_ITEMS} item` });
    }
    if (items.some((item) => item.length > KEYWORD_MAX_LENGTH)) {
      ctx.addIssue({ code: "custom", message: `Setiap keyword maksimal ${KEYWORD_MAX_LENGTH} karakter` });
    }
  });

// Teks opsional: null / "" / hanya spasi -> null.
const optionalText = (max, label) =>
  z
    .union([z.null(), z.string({ error: `${label} harus berupa teks` })])
    .transform((value) => (value === null ? null : singleLine(value) || null))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`).nullable());

// Sumber rujukan: URL http/https ATAU path relatif root ("/akreditasi"). Selain itu ditolak, termasuk
// javascript:, data:, mailto:, protocol-relative ("//host"), dan "/\host" (browser menganggapnya "//host").
const isSafeSourcePath = (value) => {
  if (/\s/.test(value)) return false;
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !value.startsWith("/\\") && !value.includes("\\");
  }
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const sourcePathField = z
  .union([z.null(), z.string({ error: "Sumber (path/URL) harus berupa teks" })])
  .transform((value) => (value === null ? null : value.replace(CONTROL_CHARS, "").trim() || null))
  .pipe(
    z
      .string()
      .max(SOURCE_PATH_MAX, `Sumber (path/URL) maksimal ${SOURCE_PATH_MAX} karakter`)
      .refine(isSafeSourcePath, "Sumber harus berupa URL http/https atau path yang diawali satu '/'")
      .nullable()
  );

const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });

// Tanggal berlaku (kolom valid_until bertipe DATE). Boleh lampau maupun mendatang.
// Hanya diterima: "YYYY-MM-DD" yang merupakan tanggal kalender nyata, atau null (tanpa batas berlaku).
// Waktu ISO 8601 dan string kosong ditolak.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const isValidDateInput = (value) => {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
};

const validUntilField = z
  .union([z.null(), z.string({ error: "Tanggal berlaku harus berupa teks tanggal" })])
  .pipe(
    z
      .string()
      .refine(isValidDateInput, "Tanggal berlaku harus berformat YYYY-MM-DD yang valid (contoh: 2026-12-31) atau null")
      .nullable()
  );

// ---------- Params ----------
const knowledgeIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID knowledge tidak valid"),
});

// ---------- Query (daftar) ----------
// String kosong pada query ("?status=") dianggap tidak dikirim.
const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const listKnowledgeQuerySchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Halaman harus berupa angka" })
      .int("Halaman harus berupa bilangan bulat")
      .min(1, "Halaman minimal 1")
      .max(100000, "Halaman terlalu besar")
      .default(1)
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Limit harus berupa angka" })
      .int("Limit harus berupa bilangan bulat")
      .min(1, "Limit minimal 1")
      .max(100, "Maksimal 100 data per halaman")
      .default(20)
  ),
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  category: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: "Kategori harus berupa teks" })
      .transform(singleLine)
      .pipe(z.string().max(CATEGORY_MAX, `Kategori maksimal ${CATEGORY_MAX} karakter`))
      .optional()
  ),
  search: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: "Kata kunci harus berupa teks" })
      .transform(singleLine)
      .pipe(z.string().max(SEARCH_MAX, `Kata kunci maksimal ${SEARCH_MAX} karakter`))
      .optional()
  ),
});

// ---------- Body ----------
// created_by / updated_by / id / timestamp TIDAK ada di sini: semuanya diatur server.
const createKnowledgeSchema = strictBody({
  title: titleField,
  category: categoryField,
  content: contentField,
  keywords: keywordsField.optional(),
  sourceLabel: optionalText(SOURCE_LABEL_MAX, "Label sumber").optional(),
  sourcePath: sourcePathField.optional(),
  status: statusField.optional(),
  validUntil: validUntilField.optional(),
});

const updateKnowledgeSchema = strictBody({
  title: titleField.optional(),
  category: categoryField.optional(),
  content: contentField.optional(),
  keywords: keywordsField.optional(),
  sourceLabel: optionalText(SOURCE_LABEL_MAX, "Label sumber").optional(),
  sourcePath: sourcePathField.optional(),
  status: statusField.optional(),
  validUntil: validUntilField.optional(),
}).refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  "Minimal satu field harus dikirim untuk memperbarui knowledge"
);

module.exports = {
  knowledgeIdParamsSchema,
  listKnowledgeQuerySchema,
  createKnowledgeSchema,
  updateKnowledgeSchema,
  isSafeSourcePath,
};
