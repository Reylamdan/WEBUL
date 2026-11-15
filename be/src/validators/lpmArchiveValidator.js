
const { z } = require("zod");

const CATEGORIES = [
  "Audit Mutu Internal",
  "RTM & RTL",
  "Laporan Tahunan",
  "Penjaminan Mutu",
  "Dokumen Pendukung",
];

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

const descriptionSchema = z.preprocess(
  toPlainText,
  z.string().max(2000).default("")
);

const categorySchema = z.enum(CATEGORIES);

const yearSchema = z.coerce
  .number()
  .int()
  .min(1900)
  .max(2100);

const dateSchema = z.iso.date();

const statusSchema = z.enum(["draft", "published"]);

const idParamsSchema = z.strictObject({
  id: z.string().uuid("ID arsip tidak valid"),
});

const publicListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.preprocess(
    toPlainText,
    z.string().max(100).optional()
  ),
  category: categorySchema.optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});

const adminListQuerySchema = publicListQuerySchema.extend({
  status: statusSchema.optional(),
});

const createArchiveSchema = z.strictObject({
  title: titleSchema,
  category: categorySchema,
  year: yearSchema,
  date: dateSchema,
  description: descriptionSchema,
  status: z.literal("draft").default("draft"),
});

const updateArchiveSchema = z
  .strictObject({
    title: titleSchema.optional(),
    category: categorySchema.optional(),
    year: yearSchema.optional(),
    date: dateSchema.optional(),
    description: descriptionSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Minimal satu data harus diperbarui",
    }
  );

module.exports = {
  CATEGORIES,
  idParamsSchema,
  publicListQuerySchema,
  adminListQuerySchema,
  createArchiveSchema,
  updateArchiveSchema,
};
