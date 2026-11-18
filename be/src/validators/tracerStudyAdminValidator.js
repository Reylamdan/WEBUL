const { z } = require("zod");
const { YEAR_MIN, YEAR_MAX, PROGRAM_MAX } = require("./tracerStudyValidator");

// Batas jumlah baris per satu kali import (body JSON dibatasi 1 MB di app.js).
const IMPORT_MAX_ROWS = 2000;

// ID baris bisa UUID atau bilangan bulat, tergantung tipe kolom id di tabel.
const ID_PATTERN = /^(\d{1,18}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// Field di luar skema ditolak supaya klien tidak bisa menyisipkan data lain ke kolom answers.
const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

// ---------- Field ----------
const yearField = z
  .number({ error: "Tahun survei harus berupa angka" })
  .int("Tahun survei harus berupa bilangan bulat")
  .min(YEAR_MIN, `Tahun survei minimal ${YEAR_MIN}`)
  .max(YEAR_MAX, `Tahun survei maksimal ${YEAR_MAX}`);

// Program studi: teks bebas; kosong/null = tidak diisi.
const programField = z
  .union([z.null(), z.string({ error: "Program studi harus berupa teks" })])
  .transform((value) => {
    if (value === null) return null;
    const clean = value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
    return clean === "" ? null : clean;
  })
  .pipe(z.string().max(PROGRAM_MAX, `Program studi maksimal ${PROGRAM_MAX} karakter`).nullable());

// F8: status alumni (1 bekerja, 2 belum memungkinkan bekerja, 3 wiraswasta, 4 lanjut studi, 5 mencari kerja).
const f8Field = z
  .number({ error: "F8 (status alumni) harus berupa angka" })
  .int("F8 harus bilangan bulat")
  .min(1, "F8 harus antara 1 dan 5")
  .max(5, "F8 harus antara 1 dan 5");

// F14: keselarasan horizontal, skala 1-5. Hanya relevan untuk alumni yang bekerja.
const f14Field = z.union([
  z.null(),
  z
    .number({ error: "F14 harus berupa angka" })
    .int("F14 harus bilangan bulat")
    .min(1, "F14 harus antara 1 dan 5")
    .max(5, "F14 harus antara 1 dan 5"),
]);

// F502: lama mendapat pekerjaan dalam bulan. Negatif = sudah bekerja sebelum lulus.
const f502Field = z.union([
  z.null(),
  z
    .number({ error: "F502 harus berupa angka" })
    .min(-600, "F502 minimal -600 bulan")
    .max(600, "F502 maksimal 600 bulan"),
]);

// F505: take home pay per bulan (rupiah).
const f505Field = z.union([
  z.null(),
  z
    .number({ error: "F505 harus berupa angka" })
    .min(0, "F505 tidak boleh negatif")
    .max(1000000000, "F505 maksimal 1.000.000.000"),
]);

// ---------- Params / Query ----------
const responseIdParamsSchema = z.object({
  id: z.string().regex(ID_PATTERN, "ID responden tidak valid"),
});

const yearParamsSchema = z.object({
  year: z.coerce
    .number({ error: "Tahun harus berupa angka" })
    .int("Tahun harus berupa bilangan bulat")
    .min(YEAR_MIN, `Tahun minimal ${YEAR_MIN}`)
    .max(YEAR_MAX, `Tahun maksimal ${YEAR_MAX}`),
});

// Konfirmasi hapus satu tahun: ?confirm=<tahun yang sama>. Dicocokkan di controller.
const deleteYearQuerySchema = z.object({
  confirm: z.coerce.number({ error: "confirm harus berupa angka" }).int("confirm harus bilangan bulat"),
});

const listResponsesQuerySchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Halaman harus berupa angka" })
      .int("Halaman harus berupa bilangan bulat")
      .min(1, "Halaman minimal 1")
      .max(100000, "Halaman terlalu besar")
      .default(1)
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Limit harus berupa angka" })
      .int("Limit harus berupa bilangan bulat")
      .min(1, "Limit minimal 1")
      .max(100, "Maksimal 100 data per halaman")
      .default(20)
  ),
  year: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "year harus berupa angka" })
      .int("year harus berupa bilangan bulat")
      .min(YEAR_MIN, `year minimal ${YEAR_MIN}`)
      .max(YEAR_MAX, `year maksimal ${YEAR_MAX}`)
      .optional()
  ),
  program: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: "program harus berupa teks" })
      .transform((value) => value.replace(CONTROL_CHARS, " ").trim())
      .pipe(z.string().max(PROGRAM_MAX, `program maksimal ${PROGRAM_MAX} karakter`))
      .transform((value) => value || undefined)
      .optional()
  ),
});

// ---------- Body ----------
const createResponseSchema = strictBody({
  surveyYear: yearField,
  studyProgram: programField.optional(),
  f8: f8Field,
  f14: f14Field.optional(),
  f502: f502Field.optional(),
  f505: f505Field.optional(),
});

const updateResponseSchema = strictBody({
  surveyYear: yearField.optional(),
  studyProgram: programField.optional(),
  f8: f8Field.optional(),
  f14: f14Field.optional(),
  f502: f502Field.optional(),
  f505: f505Field.optional(),
}).refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  "Minimal satu field harus dikirim untuk memperbarui data responden"
);

const importRowSchema = strictBody({
  studyProgram: programField.optional(),
  f8: f8Field,
  f14: f14Field.optional(),
  f502: f502Field.optional(),
  f505: f505Field.optional(),
});

const importResponsesSchema = strictBody({
  surveyYear: yearField,
  // append: tambahkan ke data yang ada. replace: ganti SELURUH data tahun survei tersebut.
  mode: z.enum(["append", "replace"], { error: "mode harus append atau replace" }),
  rows: z
    .array(importRowSchema, { error: "rows harus berupa daftar data responden" })
    .min(1, "Minimal 1 baris data")
    .max(IMPORT_MAX_ROWS, `Maksimal ${IMPORT_MAX_ROWS} baris per import`),
});

module.exports = {
  IMPORT_MAX_ROWS,
  responseIdParamsSchema,
  yearParamsSchema,
  deleteYearQuerySchema,
  listResponsesQuerySchema,
  createResponseSchema,
  updateResponseSchema,
  importResponsesSchema,
};
