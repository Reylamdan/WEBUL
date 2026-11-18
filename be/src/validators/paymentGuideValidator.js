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
const updatePaymentSettingsSchema = z
  .object({
    heroEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    heroTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    heroDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1500)).optional(),
    vaSectionEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    vaSectionTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    vaSectionDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1500)).optional(),
    vaImage1Url: z.string().transform(toPlainText).pipe(z.string().min(1).max(500)).optional(),
    vaImage1Alt: z.string().transform(toPlainText).pipe(z.string().min(1).max(255)).optional(),
    vaImage1Caption: z.string().transform(toPlainText).pipe(z.string().min(1).max(500)).optional(),
    vaImage2Url: z.string().transform(toPlainText).pipe(z.string().min(1).max(500)).optional(),
    vaImage2Alt: z.string().transform(toPlainText).pipe(z.string().min(1).max(255)).optional(),
    vaImage2Caption: z.string().transform(toPlainText).pipe(z.string().min(1).max(500)).optional(),
    methodsSectionEyebrow: z.string().transform(toPlainText).pipe(z.string().min(2).max(150)).optional(),
    methodsSectionTitle: z.string().transform(toPlainText).pipe(z.string().min(2).max(200)).optional(),
    methodsSectionDescription: z.string().transform(toPlainText).pipe(z.string().min(2).max(1500)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

// VA Step Schema
const createVaStepSchema = z.object({
  title: z
    .string({ error: "Judul langkah SiAkad wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Judul langkah minimal 2 karakter").max(200, "Judul langkah maksimal 200 karakter")),
  description: z
    .string({ error: "Deskripsi langkah SiAkad wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Deskripsi langkah minimal 2 karakter").max(1000, "Deskripsi langkah maksimal 1000 karakter")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateVaStepSchema = createVaStepSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

// Channel Schema
const createChannelSchema = z.object({
  channelId: z
    .string({ error: "ID / Slug kanal pembayaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "ID kanal minimal 2 karakter").max(100, "ID kanal maksimal 100 karakter")),
  name: z
    .string({ error: "Nama kanal pembayaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Nama kanal minimal 2 karakter").max(200, "Nama kanal maksimal 200 karakter")),
  steps: z
    .array(z.string().transform(toPlainText).pipe(z.string().min(1, "Langkah pembayaran tidak boleh kosong")))
    .default([]),
  note: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(1000).nullable()),
  technicalNoteTitle: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(200).nullable()),
  technicalNote: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== "" ? toPlainText(val) : null))
    .pipe(z.string().max(1000).nullable()),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("published"),
});

const updateChannelSchema = createChannelSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

module.exports = {
  STATUSES,
  idParamSchema,
  listQuerySchema,
  updatePaymentSettingsSchema,
  createVaStepSchema,
  updateVaStepSchema,
  createChannelSchema,
  updateChannelSchema,
};

