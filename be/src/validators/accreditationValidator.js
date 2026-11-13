
const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");
const { EXPIRY_STATUSES } = require("../utils/accreditationExpiry");

const DEFAULT_INSTITUTION_NAME = "Universitas LIA";
const DEFAULT_ISSUER = "BAN-PT";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const STATUSES = ["draft", "published"];
const RANK_MAX = 100;
const TEXT_MAX = 200;
const SEARCH_MAX = 100;

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const emptyToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const statusField = z.enum(STATUSES, {
  error: "Status harus draft atau published",
});

const textField = (label, max = TEXT_MAX) =>
  z
    .string({ error: `${label} wajib berupa teks` })
    .transform(toPlainText)
    .pipe(
      z.string()
        .trim()
        .min(1, `${label} tidak boleh kosong`)
        .max(max, `${label} maksimal ${max} karakter`)
    );

const optionalTextField = (label, max = TEXT_MAX) =>
  z
    .string({ error: `${label} harus berupa teks` })
    .transform(toPlainText)
    .pipe(
      z.string()
        .trim()
        .max(max, `${label} maksimal ${max} karakter`)
    )
    .optional();

const nullableTextField = (label, max = TEXT_MAX) =>
  z.union([optionalTextField(label, max), z.null()]);

const rankField = textField("Peringkat akreditasi", RANK_MAX);

const dateField = (label) =>
  z
    .string({ error: `${label} wajib diisi` })
    .regex(DATE_PATTERN, `${label} harus menggunakan format YYYY-MM-DD`)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, `${label} bukan tanggal yang valid`);

const optionalDateField = (label) =>
  z.union([dateField(label), z.null()]).optional();

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

const searchField = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "Kata kunci harus berupa teks" })
    .trim()
    .max(SEARCH_MAX, `Kata kunci maksimal ${SEARCH_MAX} karakter`)
    .optional()
);

const levelFilterField = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "Jenjang pendidikan harus berupa teks" })
    .trim()
    .min(1, "Jenjang pendidikan tidak boleh kosong")
    .max(50, "Jenjang pendidikan maksimal 50 karakter")
    .optional()
);

const rankFilterField = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "Peringkat harus berupa teks" })
    .trim()
    .min(1, "Peringkat tidak boleh kosong")
    .max(RANK_MAX, `Peringkat maksimal ${RANK_MAX} karakter`)
    .optional()
);

// ---- Filter pencarian program studi (admin & publik) ----
const textFilterField = (label, max) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string({ error: `${label} harus berupa teks` })
      .trim()
      .max(max, `${label} maksimal ${max} karakter`)
      .optional()
  );

const decisionYearField = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "Tahun SK harus berupa angka 4 digit" })
    .trim()
    .regex(/^\d{4}$/, "Tahun SK harus berupa angka 4 digit, contoh: 2024")
    .transform(Number)
    .refine((year) => year >= 1900 && year <= 2100, "Tahun SK harus antara 1900 dan 2100")
    .optional()
);

const filterDateField = (label) =>
  z.preprocess(emptyToUndefined, dateField(label).optional());

const expiryStatusField = z.preprocess(
  (value) => (typeof value === "string" ? emptyToUndefined(value.trim().toLowerCase()) : value),
  z
    .enum(EXPIRY_STATUSES, {
      error: `Status kedaluwarsa harus salah satu dari: ${EXPIRY_STATUSES.join(", ")}`,
    })
    .optional()
);

// Field filter baru. Semua opsional dan boleh dipakai bersamaan (logika AND).
const studyProgramSearchShape = {
  programName: textFilterField("Nama program studi", SEARCH_MAX),
  skNumber: textFilterField("Nomor SK", TEXT_MAX),
  decisionYear: decisionYearField,
  validUntilFrom: filterDateField("Tanggal kedaluwarsa mulai"),
  validUntilTo: filterDateField("Tanggal kedaluwarsa akhir"),
  expiryStatus: expiryStatusField,
};

const validateExpiryRange = (query, ctx) => {
  if (
    query.validUntilFrom &&
    query.validUntilTo &&
    query.validUntilTo < query.validUntilFrom
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["validUntilTo"],
      message: "Tanggal kedaluwarsa akhir tidak boleh lebih awal dari tanggal kedaluwarsa mulai",
    });
  }
};

const validateDateRange = (body, ctx) => {
  if (
    body.validFrom &&
    body.validUntil &&
    body.validUntil < body.validFrom
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["validUntil"],
      message: "Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai berlaku",
    });
  }
};

const accreditationIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID akreditasi tidak valid"),
});

// ---------- QUERY ADMIN ----------

const listInstitutionsQuerySchema = z.object({
  page: pageField,
  limit: limitField,
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  search: searchField,
});

const listStudyProgramsQuerySchema = z.object({
  page: pageField,
  limit: limitField,
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  search: searchField,
  level: levelFilterField,
  rank: rankFilterField,
  ...studyProgramSearchShape,
}).superRefine(validateExpiryRange);

// ---------- QUERY PUBLIK ----------

const publicListInstitutionsQuerySchema = z.object({
  page: pageField,
  limit: limitField,
  search: searchField,
});

const publicListStudyProgramsQuerySchema = z.object({
  page: pageField,
  limit: limitField,
  search: searchField,
  level: levelFilterField,
  rank: rankFilterField,
  ...studyProgramSearchShape,
}).superRefine(validateExpiryRange);

// ---------- INSTITUSI ----------

const createInstitutionSchema = strictBody({
  institutionName: optionalTextField("Nama institusi"),
  rank: rankField,
  skNumber: textField("Nomor SK"),
  decisionDate: dateField("Tanggal keputusan"),
  validFrom: dateField("Tanggal mulai berlaku"),
  validUntil: optionalDateField("Tanggal akhir berlaku"),
  issuingBody: optionalTextField("Penerbit SK"),
  status: statusField.optional(),
}).superRefine(validateDateRange);

const updateInstitutionSchema = strictBody({
  institutionName: optionalTextField("Nama institusi"),
  rank: rankField.optional(),
  skNumber: optionalTextField("Nomor SK"),
  decisionDate: optionalDateField("Tanggal keputusan"),
  validFrom: optionalDateField("Tanggal mulai berlaku"),
  validUntil: optionalDateField("Tanggal akhir berlaku"),
  issuingBody: optionalTextField("Penerbit SK"),
  status: statusField.optional(),
})
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Minimal satu field harus dikirim untuk memperbarui data"
  )
  .superRefine(validateDateRange);

// ---------- PROGRAM STUDI ----------

const createStudyProgramSchema = strictBody({
  programName: textField("Nama program studi"),
  educationLevel: textField("Jenjang pendidikan", 50),
  faculty: nullableTextField("Fakultas"),
  rank: rankField,
  skNumber: textField("Nomor SK"),
  decisionDate: optionalDateField("Tanggal keputusan"),
  validFrom: dateField("Tanggal mulai berlaku"),
  validUntil: optionalDateField("Tanggal akhir berlaku"),
  issuingBody: optionalTextField("Penerbit SK"),
  status: statusField.optional(),
}).superRefine(validateDateRange);

const updateStudyProgramSchema = strictBody({
  programName: optionalTextField("Nama program studi"),
  educationLevel: optionalTextField("Jenjang pendidikan", 50),
  faculty: nullableTextField("Fakultas"),
  rank: rankField.optional(),
  skNumber: optionalTextField("Nomor SK"),
  decisionDate: optionalDateField("Tanggal keputusan"),
  validFrom: optionalDateField("Tanggal mulai berlaku"),
  validUntil: optionalDateField("Tanggal akhir berlaku"),
  issuingBody: optionalTextField("Penerbit SK"),
  status: statusField.optional(),
})
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Minimal satu field harus dikirim untuk memperbarui data"
  )
  .superRefine(validateDateRange);

module.exports = {
  DEFAULT_INSTITUTION_NAME,
  DEFAULT_ISSUER,
  accreditationIdParamsSchema,
  listInstitutionsQuerySchema,
  listStudyProgramsQuerySchema,
  publicListInstitutionsQuerySchema,
  publicListStudyProgramsQuerySchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  createStudyProgramSchema,
  updateStudyProgramSchema,
};
