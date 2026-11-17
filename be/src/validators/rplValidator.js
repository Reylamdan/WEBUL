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
  type: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .pipe(z.enum(["syarat", "dokumen"], { error: "Type harus 'syarat' atau 'dokumen'" }).optional()),
});

// Settings Schema
const updateRplSettingsSchema = z
  .object({
    heroEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    heroDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(2000)).optional(),
    heroArtMark: z.string().transform(toPlainText).pipe(z.string().min(1).max(50)).optional(),
    heroArtCaption: z.string().transform(toPlainText).pipe(z.string().min(1).max(100)).optional(),
    sectionEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    sectionTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    benefits: z.array(z.string().transform(toPlainText).pipe(z.string().min(1).max(150))).optional(),
    scheduleNote: z.string().transform(toPlainText).pipe(z.string().min(2).max(500)).optional(),
    registrationDeadline: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    registrationUrl: z.string().transform(toPlainText).pipe(z.string().url("Format URL pendaftaran tidak valid")).optional(),
    transferCreditTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    transferCreditDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(2000)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// Step Schema
const createStepSchema = z.object({
  title: z
    .string({ error: "Judul alur pendaftaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Judul alur minimal 2 karakter").max(200, "Judul alur maksimal 200 karakter")),
  description: z
    .string({ error: "Deskripsi alur pendaftaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Deskripsi alur minimal 2 karakter").max(1000, "Deskripsi alur maksimal 1000 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateStepSchema = createStepSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

// Requirement / Document Schema
const createRequirementSchema = z.object({
  type: z.enum(["syarat", "dokumen"], { error: "Kategori harus 'syarat' atau 'dokumen'" }),
  title: z
    .string({ error: "Isi syarat atau dokumen wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(1, "Isi syarat/dokumen minimal 1 karakter").max(500, "Isi syarat/dokumen maksimal 500 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateRequirementSchema = createRequirementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

// Schedule Schema
const createScheduleSchema = z.object({
  day: z
    .string({ error: "Hari perkuliahan wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Hari perkuliahan minimal 2 karakter").max(100, "Hari perkuliahan maksimal 100 karakter")),
  hours: z
    .string({ error: "Jam perkuliahan wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Jam perkuliahan minimal 2 karakter").max(100, "Jam perkuliahan maksimal 100 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateScheduleSchema = createScheduleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

// Fee Schema
const createFeeSchema = z.object({
  type: z
    .string({ error: "Jenis biaya wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Jenis biaya minimal 2 karakter").max(100, "Jenis biaya maksimal 100 karakter")),
  amount: z
    .string({ error: "Nominal biaya wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(1, "Nominal biaya minimal 1 karakter").max(100, "Nominal biaya maksimal 100 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateFeeSchema = createFeeSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  idParamSchema,
  listQuerySchema,
  updateRplSettingsSchema,
  createStepSchema,
  updateStepSchema,
  createRequirementSchema,
  updateRequirementSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createFeeSchema,
  updateFeeSchema,
};

