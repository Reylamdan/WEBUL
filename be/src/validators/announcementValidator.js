const { z } = require("zod");
const { sanitizeArticleHtml, toPlainText } = require("../utils/sanitizeHtml");
const { htmlToText } = require("../utils/excerpt");
const { SLUG_MAX_LENGTH, SLUG_PATTERN } = require("../utils/slug");

// Batas ini mengikuti constraint di tabel announcements
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const EXCERPT_MAX = 500;
const CONTENT_MAX = 200000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES = ["draft", "published"];

// Field di luar skema (misalnya authorId, publishedAt, id) ditolak,
// supaya klien tidak bisa menyisipkan data yang seharusnya diatur server.
const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

// ---------- Field ----------
const titleField = z
  .string({ error: "Judul wajib diisi" })
  .transform(toPlainText)
  .pipe(
    z
      .string()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

// Isi pengumuman: dibatasi panjangnya, disanitasi, lalu dipastikan masih punya teks yang layak.
const contentHtmlField = z
  .string({ error: "Isi pengumuman wajib diisi" })
  .max(CONTENT_MAX, `Isi pengumuman maksimal ${CONTENT_MAX.toLocaleString("id-ID")} karakter`)
  .transform(sanitizeArticleHtml)
  .pipe(
    z
      .string()
      .max(CONTENT_MAX, `Isi pengumuman maksimal ${CONTENT_MAX.toLocaleString("id-ID")} karakter setelah dibersihkan`)
      .refine(
        (html) => htmlToText(html).length > 0,
        "Isi pengumuman tidak memiliki konten yang layak setelah dibersihkan"
      )
  );

// Excerpt. Hasil parsing:
//   undefined -> tidak dikirim (create: dibuat otomatis, update: excerpt lama dipertahankan)
//   ""        -> dikirim kosong/null (dibuat otomatis dari isi pengumuman)
//   "teks"    -> excerpt dari admin
const excerptField = z
  .union([z.null(), z.string({ error: "Excerpt harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return "";
    return toPlainText(value);
  })
  .pipe(z.string().max(EXCERPT_MAX, `Excerpt maksimal ${EXCERPT_MAX} karakter`).optional());

const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });

// Slug eksplisit (hanya untuk PATCH admin atau lookup publik).
const slugField = z
  .string({ error: "Slug harus berupa teks" })
  .trim()
  .toLowerCase()
  .min(1, "Slug tidak boleh kosong")
  .max(SLUG_MAX_LENGTH, `Slug maksimal ${SLUG_MAX_LENGTH} karakter`)
  .regex(SLUG_PATTERN, "Slug hanya boleh huruf kecil, angka, dan tanda hubung (contoh: pengumuman-krs-2026)");

// ---------- Params ----------
const announcementIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID pengumuman tidak valid"),
});

const announcementSlugParamsSchema = z.object({
  slug: slugField,
});

// ---------- Query (daftar) ----------
const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const listAnnouncementsQuerySchema = z.object({
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
      .max(50, "Maksimal 50 data per halaman")
      .default(9)
  ),
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  search: z.preprocess(
    emptyToUndefined,
    z.string({ error: "Kata kunci harus berupa teks" }).trim().max(100, "Kata kunci maksimal 100 karakter").optional()
  ),
});

// Query daftar publik: tidak menyediakan filter status karena publik HANYA melihat published
const publicListAnnouncementsQuerySchema = z.object({
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
      .max(50, "Maksimal 50 data per halaman")
      .default(9)
  ),
  search: z.preprocess(
    emptyToUndefined,
    z.string({ error: "Kata kunci harus berupa teks" }).trim().max(100, "Kata kunci maksimal 100 karakter").optional()
  ),
});

// ---------- Body ----------
const createAnnouncementSchema = strictBody({
  title: titleField,
  contentHtml: contentHtmlField,
  excerpt: excerptField,
  status: statusField.optional(),
});

const updateAnnouncementSchema = strictBody({
  title: titleField.optional(),
  contentHtml: contentHtmlField.optional(),
  excerpt: excerptField,
  status: statusField.optional(),
  slug: slugField.optional(),
}).refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  "Minimal satu field harus dikirim untuk memperbarui pengumuman"
);

module.exports = {
  announcementIdParamsSchema,
  announcementSlugParamsSchema,
  listAnnouncementsQuerySchema,
  publicListAnnouncementsQuerySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
