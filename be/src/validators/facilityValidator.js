const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const TITLE_MIN = 2;
const TITLE_MAX = 150;
const DESC_MAX = 1000;
const SORT_MAX = 9999;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];

const plainMultiline = (input) =>
  String(input)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(toPlainText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const facilityIdParamsSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listFacilitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .pipe(z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).optional()),
  search: z
    .string()
    .optional()
    .transform((val) => (val ? toPlainText(val) : undefined)),
});

const createFacilitySchema = z.object({
  title: z
    .string({ error: "Judul fasilitas wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`).max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)),
  description: z
    .string({ error: "Deskripsi fasilitas wajib diisi" })
    .transform(plainMultiline)
    .pipe(z.string().min(2, "Deskripsi minimal 2 karakter").max(DESC_MAX, `Deskripsi maksimal ${DESC_MAX} karakter`)),
  sortOrder: z.coerce.number().int().min(0).max(SORT_MAX).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("draft"),
});

const updateFacilitySchema = createFacilitySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

const updateFacilitySettingsSchema = z
  .object({
    heroTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul hero minimal 2 karakter").max(TITLE_MAX, `Judul hero maksimal ${TITLE_MAX} karakter`))
      .optional(),
    heroSubtitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Subtitle hero minimal 2 karakter").max(500, "Subtitle hero maksimal 500 karakter"))
      .optional(),
    galleryEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow minimal 2 karakter").max(100, "Eyebrow maksimal 100 karakter"))
      .optional(),
    galleryTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul galeri minimal 2 karakter").max(TITLE_MAX, "Judul galeri maksimal 150 karakter"))
      .optional(),
    galleryDescription: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Deskripsi galeri minimal 2 karakter").max(500, "Deskripsi galeri maksimal 500 karakter"))
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

module.exports = {
  facilityIdParamsSchema,
  listFacilitiesQuerySchema,
  createFacilitySchema,
  updateFacilitySchema,
  updateFacilitySettingsSchema,
};

