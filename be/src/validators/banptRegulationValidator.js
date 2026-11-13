const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["draft", "published"];
const NUMBER_MAX = 100;
const TITLE_MAX = 500;
const SEARCH_MAX = 100;
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const emptyToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const textField = (label, max) =>
  z
    .string({ error: `${label} wajib berupa teks` })
    .transform(toPlainText)
    .pipe(z.string().trim().min(1, `${label} tidak boleh kosong`).max(max, `${label} maksimal ${max} karakter`));

const dateField = (label) =>
  z
    .string({ error: `${label} wajib berupa teks tanggal` })
    .regex(DATE_PATTERN, `${label} harus menggunakan format YYYY-MM-DD`)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, `${label} bukan tanggal yang valid`);

// Tahun di body: angka 1900-2100 (string "2024" juga diterima)
const yearField = z
  .union([z.number(), z.string().trim().regex(/^\d{4}$/, "Tahun peraturan harus 4 digit")], {
    error: "Tahun peraturan harus berupa angka",
  })
  .transform(Number)
  .refine(
    (year) => Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX,
    `Tahun peraturan harus antara ${YEAR_MIN} dan ${YEAR_MAX}`
  );

const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });

const idParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID peraturan tidak valid"),
});
const attachmentParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID peraturan tidak valid"),
  attachmentId: z.string().regex(UUID_PATTERN, "ID lampiran tidak valid"),
});

// ---------- QUERY ----------
const pageField = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Halaman harus berupa angka" })
    .int("Halaman harus berupa bilangan bulat")
    .min(1, "Halaman minimal 1")
    .max(100000, "Halaman terlalu besar")
    .default(1)
);
const limitField = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Limit harus berupa angka" })
    .int("Limit harus berupa bilangan bulat")
    .min(1, "Limit minimal 1")
    .max(50, "Maksimal 50 data per halaman")
    .default(10)
);
const textFilter = (label, max) =>
  z.preprocess(
    emptyToUndefined,
    z.string({ error: `${label} harus berupa teks` }).trim().max(max, `${label} maksimal ${max} karakter`).optional()
  );
const yearFilter = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "Tahun harus berupa angka 4 digit" })
    .trim()
    .regex(/^\d{4}$/, "Tahun harus berupa angka 4 digit, contoh: 2024")
    .transform(Number)
    .refine((y) => y >= YEAR_MIN && y <= YEAR_MAX, `Tahun harus antara ${YEAR_MIN} dan ${YEAR_MAX}`)
    .optional()
);
const dateFilter = (label) => z.preprocess(emptyToUndefined, dateField(label).optional());

const validateRange = (query, ctx) => {
  if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["dateTo"],
      message: "Tanggal akhir tidak boleh lebih awal dari tanggal mulai",
    });
  }
};

const publicShape = {
  page: pageField,
  limit: limitField,
  search: textFilter("Kata kunci", SEARCH_MAX),
  year: yearFilter,
  regulationNumber: textFilter("Nomor peraturan", NUMBER_MAX),
  dateFrom: dateFilter("Tanggal mulai"),
  dateTo: dateFilter("Tanggal akhir"),
};

const publicListQuerySchema = z.object(publicShape).superRefine(validateRange);
const adminListQuerySchema = z
  .object({ ...publicShape, status: z.preprocess(emptyToUndefined, statusField.optional()) })
  .superRefine(validateRange);

// ---------- BODY ----------
const createRegulationSchema = strictBody({
  regulationNumber: textField("Nomor peraturan", NUMBER_MAX),
  regulationYear: yearField,
  determinationDate: dateField("Tanggal penetapan"),
  title: textField("Judul peraturan", TITLE_MAX),
  status: statusField.optional(),
});

const updateRegulationSchema = strictBody({
  regulationNumber: textField("Nomor peraturan", NUMBER_MAX).optional(),
  regulationYear: yearField.optional(),
  determinationDate: dateField("Tanggal penetapan").optional(),
  title: textField("Judul peraturan", TITLE_MAX).optional(),
  status: statusField.optional(),
}).refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  "Minimal satu field harus dikirim untuk memperbarui data"
);

module.exports = {
  idParamsSchema,
  attachmentParamsSchema,
  publicListQuerySchema,
  adminListQuerySchema,
  createRegulationSchema,
  updateRegulationSchema,
};
