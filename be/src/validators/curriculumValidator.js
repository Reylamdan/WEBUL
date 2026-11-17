const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];

const programIdParamsSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listProgramsQuerySchema = z.object({
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

const createProgramSchema = z.object({
  name: z
    .string({ error: "Nama program studi wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Nama program studi minimal 2 karakter").max(150, "Nama program studi maksimal 150 karakter")),
  href: z
    .string({ error: "Tautan URL wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(1, "Tautan minimal 1 karakter").max(255, "Tautan maksimal 255 karakter")),
  focus: z
    .string({ error: "Fokus pembelajaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Fokus pembelajaran minimal 2 karakter").max(500, "Fokus pembelajaran maksimal 500 karakter")),
  components: z
    .string({ error: "Komponen kurikulum wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Komponen kurikulum minimal 2 karakter").max(500, "Komponen kurikulum maksimal 500 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("draft"),
});

const updateProgramSchema = createProgramSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

const updateCurriculumSettingsSchema = z
  .object({
    heroEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow hero minimal 2 karakter").max(100, "Eyebrow hero maksimal 100 karakter"))
      .optional(),
    heroTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul hero minimal 2 karakter").max(150, "Judul hero maksimal 150 karakter"))
      .optional(),
    heroDescription: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Deskripsi hero minimal 2 karakter").max(1000, "Deskripsi hero maksimal 1000 karakter"))
      .optional(),
    obeTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul OBE minimal 2 karakter").max(150, "Judul OBE maksimal 150 karakter"))
      .optional(),
    obeLead: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Lead OBE minimal 2 karakter").max(500, "Lead OBE maksimal 500 karakter"))
      .optional(),
    obeDescription: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Deskripsi OBE minimal 2 karakter").max(2000, "Deskripsi OBE maksimal 2000 karakter"))
      .optional(),
    tableEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow tabel minimal 2 karakter").max(100, "Eyebrow tabel maksimal 100 karakter"))
      .optional(),
    tableTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul tabel minimal 2 karakter").max(150, "Judul tabel maksimal 150 karakter"))
      .optional(),
    tableIntro: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Intro tabel minimal 2 karakter").max(1000, "Intro tabel maksimal 1000 karakter"))
      .optional(),
    tableNote: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Catatan tabel minimal 2 karakter").max(500, "Catatan tabel maksimal 500 karakter"))
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

module.exports = {
  programIdParamsSchema,
  listProgramsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  updateCurriculumSettingsSchema,
};

