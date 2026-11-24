const { z } = require("zod");
const { PROGRAM_MAX } = require("./tracerStudyValidator");

const CURRENT_YEAR = () => new Date().getFullYear();

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const cleanText = (label, max, min = 1) =>
  z
    .string({ error: `${label} wajib diisi` })
    .transform((v) => v.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(min, `${label} wajib diisi`)
        .max(max, `${label} maksimal ${max} karakter`)
    );

// ---------- Data diri alumni ----------
const alumniSchema = strictBody({
  fullName: cleanText("Nama lengkap", 120, 2),
  nim: cleanText("NIM", 30).pipe(z.string().regex(/^[A-Za-z0-9./-]+$/, "NIM hanya boleh huruf, angka, titik, garis miring, dan strip")),
  studyProgram: cleanText("Program studi", PROGRAM_MAX),
  graduationYear: z
    .number({ error: "Tahun lulus harus berupa angka" })
    .int("Tahun lulus harus bilangan bulat")
    .min(1980, "Tahun lulus minimal 1980")
    .refine((y) => y <= CURRENT_YEAR(), "Tahun lulus tidak boleh melebihi tahun ini"),
  email: z
    .string({ error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .max(160, "Email maksimal 160 karakter")
    .pipe(z.email("Format email tidak valid")),
  phone: z
    .union([z.null(), z.string({ error: "Nomor HP harus berupa teks" })])
    .optional()
    .transform((v) => (v == null ? null : v.replace(/[\s-]/g, "")))
    .pipe(
      z
        .string()
        .regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor HP tidak valid (contoh: 081234567890)")
        .nullable()
        .or(z.literal("").transform(() => null))
    ),
});

// ---------- Jawaban tracer study ----------
const scale1to5 = (label) =>
  z
    .number({ error: `${label} harus berupa angka` })
    .int(`${label} harus bilangan bulat`)
    .min(1, `${label} harus antara 1 dan 5`)
    .max(5, `${label} harus antara 1 dan 5`);

const optional = (schema) => z.union([z.null(), schema]).optional();

const tracerSchema = strictBody({
  f8: scale1to5("F8 (status alumni)"),
  f14: optional(scale1to5("F14 (keselarasan pekerjaan)")),
  f502: optional(
    z
      .number({ error: "F502 harus berupa angka" })
      .min(-600, "F502 minimal -600 bulan")
      .max(600, "F502 maksimal 600 bulan")
  ),
  f505: optional(
    z
      .number({ error: "F505 harus berupa angka" })
      .min(0, "F505 tidak boleh negatif")
      .max(1000000000, "F505 maksimal 1.000.000.000")
  ),
});

const submissionSchema = strictBody({
  alumni: alumniSchema,
  tracer: tracerSchema,
  // basketball | form: hanya untuk pencatatan cara kirim, tidak memengaruhi data.
  channel: z.enum(["form", "basketball"], { error: "channel harus form atau basketball" }).default("form"),
});

module.exports = { submissionSchema };
