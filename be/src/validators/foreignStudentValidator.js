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
const updateForeignStudentSettingsSchema = z
  .object({
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    introEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    introTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    introDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(2000)).optional(),
    requirementsEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    requirementsTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    requirementsDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(2000)).optional(),
    referenceTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    referenceDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1000)).optional(),
    referenceUrl: z.string().transform(toPlainText).pipe(z.string().min(2).max(500)).optional(),
    referenceLabel: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// Requirement Schema
const createRequirementSchema = z.object({
  title: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(150).nullable()),
  description: z
    .string({ error: "Isi dokumen persyaratan wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(3, "Isi dokumen persyaratan minimal 3 karakter").max(2000, "Maksimal 2000 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateRequirementSchema = createRequirementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  idParamSchema,
  listQuerySchema,
  updateForeignStudentSettingsSchema,
  createRequirementSchema,
  updateRequirementSchema,
};

