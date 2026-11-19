const { z } = require("zod");

const toPlainText = (value) =>
  typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : value;

const yearSchema = z.coerce.number().int().min(1900).max(2100);

const titleSchema = z.preprocess(
  toPlainText,
  z.string().min(1, "Judul wajib diisi").max(200)
);

const descriptionSchema = z.preprocess(
  toPlainText,
  z.string().max(2000).default("")
);

const statusSchema = z.enum(["draft", "published"]);

const idParamsSchema = z.strictObject({
  id: z.string().uuid("ID laporan tidak valid"),
});

const yearParamsSchema = z.strictObject({ year: yearSchema });

const publicListQuerySchema = z.strictObject({});

const adminListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(toPlainText, z.string().max(100).optional()),
  status: statusSchema.optional(),
});

const createReportSchema = z.strictObject({
  year: yearSchema,
  title: titleSchema,
  description: descriptionSchema,
  status: statusSchema.default("draft"),
});

const updateReportSchema = z
  .strictObject({
    year: yearSchema.optional(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diperbarui",
  });

module.exports = {
  idParamsSchema,
  yearParamsSchema,
  publicListQuerySchema,
  adminListQuerySchema,
  createReportSchema,
  updateReportSchema,
};
