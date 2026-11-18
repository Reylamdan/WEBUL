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
const updateResignationSettingsSchema = z
  .object({
    heroEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    heroDescription: z
      .string()
      .nullish()
      .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
      .pipe(z.string().max(1000).nullable()),
    sectionTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// Term Schema
const createTermSchema = z.object({
  title: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(150).nullable()),
  description: z
    .string({ error: "Isi syarat & ketentuan wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(5, "Isi syarat & ketentuan minimal 5 karakter").max(2000, "Maksimal 2000 karakter")),
  refundPercentage: z.coerce
    .number()
    .int()
    .min(0, "Persentase pengembalian minimal 0%")
    .max(100, "Persentase pengembalian maksimal 100%")
    .nullish(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateTermSchema = createTermSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  idParamSchema,
  listQuerySchema,
  updateResignationSettingsSchema,
  createTermSchema,
  updateTermSchema,
};

