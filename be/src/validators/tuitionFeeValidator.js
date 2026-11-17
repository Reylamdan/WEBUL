const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];

const waveIdParamsSchema = z.object({
  id: z.string({ error: "ID wajib diisi" }).regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

const listWavesQuerySchema = z.object({
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

const tuitionItemSchema = z.object({
  program: z
    .string({ error: "Nama program studi wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(1, "Nama program studi minimal 1 karakter").max(150, "Nama program studi maksimal 150 karakter")),
  amount: z.coerce
    .number({ error: "Nominal UKT wajib berupa angka" })
    .min(0, "Nominal UKT tidak boleh negatif")
    .max(1000000000, "Nominal UKT maksimal Rp 1.000.000.000"),
});

const createWaveSchema = z.object({
  name: z
    .string({ error: "Nama gelombang pendaftaran wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Nama gelombang minimal 2 karakter").max(150, "Nama gelombang maksimal 150 karakter")),
  period: z
    .string({ error: "Periode tanggal gelombang wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(2, "Periode minimal 2 karakter").max(150, "Periode maksimal 150 karakter")),
  fees: z
    .array(tuitionItemSchema)
    .default([]),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES, { error: "Status harus 'draft' atau 'published'" }).default("draft"),
});

const updateWaveSchema = createWaveSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui data");

const updateTuitionSettingsSchema = z
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
    sectionEyebrow: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Eyebrow bagian minimal 2 karakter").max(100, "Eyebrow bagian maksimal 100 karakter"))
      .optional(),
    sectionTitle: z
      .string()
      .transform(toPlainText)
      .pipe(z.string().min(2, "Judul bagian minimal 2 karakter").max(150, "Judul bagian maksimal 150 karakter"))
      .optional(),
    studyPrograms: z
      .array(
        z
          .string()
          .transform(toPlainText)
          .pipe(z.string().min(1, "Nama program studi minimal 1 karakter").max(150, "Nama program studi maksimal 150 karakter"))
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Minimal satu kolom harus diisi untuk memperbarui pengaturan");

module.exports = {
  STATUSES,
  waveIdParamsSchema,
  listWavesQuerySchema,
  tuitionItemSchema,
  createWaveSchema,
  updateWaveSchema,
  updateTuitionSettingsSchema,
};

