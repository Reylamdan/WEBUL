const { z } = require("zod");

const toPlainText = (value) =>
  typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : value;

const titleSchema = z.preprocess(
  toPlainText,
  z.string().min(1, "Judul wajib diisi").max(200)
);

const descriptionSchema = z.preprocess(
  toPlainText,
  z.string().max(2000).default("")
);

// Tanggal opsional: "" / null berarti tanpa tanggal.
const dateSchema = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.iso.date().nullable()
);

// Tautan: path internal ("/lpm/...") atau URL https. Skema lain (javascript:, //host) ditolak.
const linkSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .union([z.literal(""), z.null(), z.string().max(500)])
    .refine(
      (v) =>
        v === "" ||
        v === null ||
        (/^\/(?!\/)[^\s\\]*$/.test(v)) ||
        (() => {
          try {
            return new URL(v).protocol === "https:";
          } catch {
            return false;
          }
        })(),
      { message: "Tautan harus berupa path internal (/...) atau URL https" }
    )
    .transform((v) => (v === "" ? null : v))
);

const sortOrderSchema = z.coerce.number().int().min(0).max(9999);

const statusSchema = z.enum(["draft", "published"]);

const idParamsSchema = z.strictObject({
  id: z.string().uuid("ID kegiatan tidak valid"),
});

const publicListQuerySchema = z.strictObject({});

const adminListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(toPlainText, z.string().max(100).optional()),
  status: statusSchema.optional(),
});

const createActivitySchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema,
  activityDate: dateSchema.default(null),
  linkUrl: linkSchema.default(null),
  sortOrder: sortOrderSchema.default(0),
  status: statusSchema.default("published"),
});

const updateActivitySchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    activityDate: dateSchema.optional(),
    linkUrl: linkSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diperbarui",
  });

module.exports = {
  idParamsSchema,
  publicListQuerySchema,
  adminListQuerySchema,
  createActivitySchema,
  updateActivitySchema,
};
