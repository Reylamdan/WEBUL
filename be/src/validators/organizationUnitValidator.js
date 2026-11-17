const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");
const { ORGANIZATION_CATEGORY_SLUGS } = require("../utils/organizationCategories");

// Batas ini mengikuti constraint tabel organization_units (supabase/migrations/20261117_organization_units.sql)
const TITLE_MIN = 3;
const TITLE_MAX = 150;
const POSITION_MAX = 150;
const DESCRIPTION_MAX = 5000;
const SORT_MAX = 9999;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const titleField = z
  .string({ error: "Judul wajib diisi" })
  .transform(toPlainText)
  .pipe(
    z
      .string()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

// Teks satu baris opsional. undefined = tidak dikirim; null / "" = dikosongkan.
const positionField = z
  .union([z.null(), z.string({ error: "Jabatan harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return toPlainText(value) || null;
  })
  .pipe(z.string().max(POSITION_MAX, `Jabatan maksimal ${POSITION_MAX} karakter`).nullable().optional());

const plainMultiline = (input) =>
  String(input)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(toPlainText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const descriptionField = z
  .union([z.null(), z.string({ error: "Deskripsi harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return plainMultiline(value) || null;
  })
  .pipe(z.string().max(DESCRIPTION_MAX, `Deskripsi maksimal ${DESCRIPTION_MAX} karakter`).nullable().optional());

const categoryField = z.enum(ORGANIZATION_CATEGORY_SLUGS, {
  error: `Kategori tidak dikenal. Pilihan: ${ORGANIZATION_CATEGORY_SLUGS.join(", ")}`,
});
const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });
const sortOrderField = z
  .number({ error: "Urutan harus berupa angka" })
  .int("Urutan harus berupa bilangan bulat")
  .min(0, "Urutan minimal 0")
  .max(SORT_MAX, `Urutan maksimal ${SORT_MAX}`);

// ---------- Params ----------
const unitIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID tidak valid"),
});

// ---------- Query ----------
const pageField = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Halaman harus berupa angka" })
    .int("Halaman harus berupa bilangan bulat")
    .min(1, "Halaman minimal 1")
    .max(100000, "Halaman terlalu besar")
    .default(1)
);

const limitField = (defaultValue) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Limit harus berupa angka" })
      .int("Limit harus berupa bilangan bulat")
      .min(1, "Limit minimal 1")
      .max(100, "Maksimal 100 data per halaman")
      .default(defaultValue)
  );

const categoryQueryField = z.preprocess(emptyToUndefined, categoryField.optional());
const searchField = z.preprocess(
  emptyToUndefined,
  z.string({ error: "Kata kunci harus berupa teks" }).trim().max(100, "Kata kunci maksimal 100 karakter").optional()
);

const listUnitsQuerySchema = z.object({
  page: pageField,
  limit: limitField(20),
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  category: categoryQueryField,
  search: searchField,
});

// Publik: tanpa filter status (publik HANYA melihat published).
const publicListUnitsQuerySchema = z.object({
  limit: limitField(100),
  category: categoryQueryField,
});

// ---------- Body ----------
const createUnitSchema = strictBody({
  title: titleField,
  position: positionField,
  description: descriptionField,
  category: categoryField,
  sortOrder: sortOrderField.optional(),
  status: statusField.optional(),
});

const updateUnitSchema = strictBody({
  title: titleField.optional(),
  position: positionField,
  description: descriptionField,
  category: categoryField.optional(),
  sortOrder: sortOrderField.optional(),
  status: statusField.optional(),
}).refine((body) => Object.values(body).some((value) => value !== undefined), "Minimal satu field harus dikirim untuk memperbarui data");

module.exports = {
  unitIdParamsSchema,
  listUnitsQuerySchema,
  publicListUnitsQuerySchema,
  createUnitSchema,
  updateUnitSchema,
};
