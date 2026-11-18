const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];
const UKM_CATEGORIES = ["seni", "olahraga", "teknologi", "organisasi", "sosial"];

const CATEGORY_LABELS = {
  seni: "Seni & Kreativitas",
  olahraga: "Olahraga",
  teknologi: "Teknologi",
  organisasi: "Organisasi",
  sosial: "Sosial & Kerohanian",
};

const idParamSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .pipe(z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).optional()),
  category: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .pipe(z.enum(UKM_CATEGORIES, { error: "Kategori tidak valid" }).optional()),
  search: z
    .string()
    .optional()
    .transform((val) => (val ? toPlainText(val) : undefined)),
});

// Settings Schema
const updateUkmSettingsSchema = z
  .object({
    heroEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    heroSubtitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(500)).optional(),
    heroBadge: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    introEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    introTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    introDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(2000)).optional(),
    categoryTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    categoryDesc: z.string().transform(toPlainText).pipe(z.string().min(2).max(500)).optional(),
    cardsTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    cardsDesc: z.string().transform(toPlainText).pipe(z.string().min(2).max(500)).optional(),
    ctaTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    ctaDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1000)).optional(),
    ctaButtonLabel: z.string().transform(toPlainText).pipe(z.string().min(2).max(100)).optional(),
    modalTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    modalSubtitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    modalScheduleText: z.string().transform(toPlainText).pipe(z.string().min(2).max(1000)).optional(),
    modalRequirementsText: z.string().transform(toPlainText).pipe(z.string().min(2).max(1000)).optional(),
    modalContactEmail: z.string().transform(toPlainText).pipe(z.string().email("Format email kontak tidak valid")).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// Item Schema
const createUkmItemSchema = z.object({
  title: z
    .string({ error: "Nama / judul UKM wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Nama UKM minimal 2 karakter").max(200, "Maksimal 200 karakter")),
  category: z.enum(UKM_CATEGORIES, { error: "Kategori UKM wajib dipilih dan valid" }),
  categoryLabel: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(100).nullable()),
  description: z
    .string({ error: "Deskripsi UKM wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(3, "Deskripsi minimal 3 karakter").max(2000, "Maksimal 2000 karakter")),
  meta: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(200).nullable()),
  imageUrl: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(500).nullable()),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateUkmItemSchema = createUkmItemSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  UKM_CATEGORIES,
  CATEGORY_LABELS,
  idParamSchema,
  listQuerySchema,
  updateUkmSettingsSchema,
  createUkmItemSchema,
  updateUkmItemSchema,
};

