const { z } = require("zod");

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
const PROGRAM_MAX = 100;

// Karakter kontrol (termasuk NUL) dibuang karena PostgreSQL menolak NUL pada teks.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// Filter opsional untuk GET /api/tracer-study/summary.
//   year    -> tahun survei (survey_year), angka bulat
//   program -> nama program studi, harus sama persis dengan yang tersimpan
const tracerStudyQuerySchema = z.object({
  year: z.coerce
    .number({ error: "year harus berupa angka" })
    .int("year harus berupa bilangan bulat")
    .min(YEAR_MIN, `year minimal ${YEAR_MIN}`)
    .max(YEAR_MAX, `year maksimal ${YEAR_MAX}`)
    .optional(),
  program: z
    .string({ error: "program harus berupa teks" })
    .transform((value) => value.replace(CONTROL_CHARS, " ").trim())
    .pipe(z.string().max(PROGRAM_MAX, `program maksimal ${PROGRAM_MAX} karakter`))
    .transform((value) => value || undefined)
    .optional(),
});

module.exports = { tracerStudyQuerySchema, YEAR_MIN, YEAR_MAX, PROGRAM_MAX };