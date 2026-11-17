const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const TITLE_MIN = 2;
const TITLE_MAX = 150;
const DESC_MAX = 500;
const HREF_MAX = 255;
const BODY_MAX = 5000;
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

const cardIdParamsSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listCardsQuerySchema = z.object({
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

const createCardSchema = z.object({
  title: z
    .string({ error: "Judul kartu wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`).max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)),
  description: z
    .string({ error: "Deskripsi kartu wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Deskripsi minimal 2 karakter").max(DESC_MAX, `Deskripsi maksimal ${DESC_MAX} karakter`)),
  href: z
    .string({ error: "Tautan URL wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(1, "Tautan minimal 1 karakter").max(HREF_MAX, `Tautan maksimal ${HREF_MAX} karakter`)),
  sortOrder: z.coerce.number().int().min(0).max(SORT_MAX).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("draft"),
});

const updateCardSchema = createCardSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

const updateProfileContentSchema = z
  .object({
    heroTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Judul hero minimal 3 karakter").max(TITLE_MAX, `Judul hero maksimal ${TITLE_MAX} karakter`))
      .optional(),
    heroSubtitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Subtitle hero minimal 3 karakter").max(DESC_MAX, `Subtitle hero maksimal ${DESC_MAX} karakter`))
      .optional(),
    aboutEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow minimal 2 karakter").max(100, "Eyebrow maksimal 100 karakter"))
      .optional(),
    aboutTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Judul tentang kami minimal 3 karakter").max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`))
      .optional(),
    aboutLead: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Lead tentang kami minimal 3 karakter").max(DESC_MAX, `Lead maksimal ${DESC_MAX} karakter`))
      .optional(),
    aboutBody: z
      .string()
      .transform(plainMultiline)
      .pipe(z.string().min(10, "Isi teks minimal 10 karakter").max(BODY_MAX, `Isi teks maksimal ${BODY_MAX} karakter`))
      .optional(),
    exploreEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow jelajahi minimal 2 karakter").max(100, "Eyebrow maksimal 100 karakter"))
      .optional(),
    exploreTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Judul jelajahi minimal 3 karakter").max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`))
      .optional(),
    exploreDescription: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Deskripsi jelajahi minimal 3 karakter").max(DESC_MAX, `Deskripsi maksimal ${DESC_MAX} karakter`))
      .optional(),
    bottomNote: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(3, "Catatan kaki minimal 3 karakter").max(DESC_MAX, `Catatan kaki maksimal ${DESC_MAX} karakter`))
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui konten");

module.exports = {
  cardIdParamsSchema,
  listCardsQuerySchema,
  createCardSchema,
  updateCardSchema,
  updateProfileContentSchema,
};

