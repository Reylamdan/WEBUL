const { z } = require("zod");

const toPlainText = (value) =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : value;

const titleSchema = z.preprocess(
  toPlainText,
  z.string().min(1, "Judul wajib diisi").max(200)
);

const institutionSchema = z.preprocess(
  toPlainText,
  z.string().max(200).default("")
);

// Label kecil di kartu FE (contoh: "DOKUMENTASI").
const labelSchema = z.preprocess(
  toPlainText,
  z.string().max(60).default("")
);

const descriptionSchema = z.preprocess(
  toPlainText,
  z.string().max(2000).default("")
);

const dateSchema = z.iso.date();

const statusSchema = z.enum(["draft", "published"]);

const idParamsSchema = z.strictObject({
  id: z.string().uuid("ID benchmarking tidak valid"),
});

const publicListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.preprocess(
    toPlainText,
    z.string().max(100).optional()
  ),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});

const adminListQuerySchema = publicListQuerySchema.extend({
  status: statusSchema.optional(),
});

// Benchmarking baru selalu draft: belum punya dokumen.
const createBenchmarkingSchema = z.strictObject({
  title: titleSchema,
  institution: institutionSchema,
  label: labelSchema,
  date: dateSchema,
  description: descriptionSchema,
  status: z.literal("draft").default("draft"),
});

const updateBenchmarkingSchema = z
  .strictObject({
    title: titleSchema.optional(),
    institution: institutionSchema.optional(),
    label: labelSchema.optional(),
    date: dateSchema.optional(),
    description: descriptionSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diperbarui",
  });

module.exports = {
  idParamsSchema,
  publicListQuerySchema,
  adminListQuerySchema,
  createBenchmarkingSchema,
  updateBenchmarkingSchema,
};
