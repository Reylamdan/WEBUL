const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];

const idParamSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
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

// Settings Schema
const updateRectorReportSettingsSchema = z
  .object({
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    heroDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1000)).optional(),
    archiveTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    contactEmail: z.string().transform(toPlainText).pipe(z.string().email("Format email kontak tidak valid")).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// Report Schema
const createRectorReportSchema = z.object({
  year: z.coerce
    .number({ error: "Tahun laporan wajib diisi" })
    .int("Tahun harus berupa bilangan bulat")
    .min(1900, "Tahun minimal 1900")
    .max(2100, "Tahun maksimal 2100"),
  title: z
    .string({ error: "Judul laporan wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Judul laporan minimal 2 karakter").max(200, "Maksimal 200 karakter")),
  description: z
    .string()
    .default("")
    .transform(toPlainText)
    .pipe(z.string().max(2000, "Deskripsi maksimal 2000 karakter")),
  coverUrl: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(500).nullable()),
  fileUrl: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(500).nullable()),
  contactEmail: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().email("Format email tidak valid").nullable()),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateRectorReportSchema = createRectorReportSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  idParamSchema,
  listQuerySchema,
  updateRectorReportSettingsSchema,
  createRectorReportSchema,
  updateRectorReportSchema,
};

