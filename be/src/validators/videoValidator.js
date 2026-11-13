const { z } = require("zod");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Modul yang diizinkan mengelola video. HANYA modul yang punya tabel induk dan verifikasi relasi
// (lihat MODULE_TABLES di adminVideoController dan pemeriksaan published di publicVideoController).
// Modul lain (student-activities, campus-profile, academic-info, promotions, documentation) belum punya
// tabel induk, jadi DITOLAK sampai tabelnya ada; tambahkan di sini dan di kedua controller sekaligus.
const ALLOWED_MODULES = ["news", "announcements"];

const videoParamsSchema = z.object({
  module: z
    .string({ required_error: "Parameter module wajib diisi" })
    .trim()
    .toLowerCase()
    // Hanya modul yang terdaftar di whitelist; nama modul bebas ditolak agar video tidak bisa
    // ditempelkan ke "modul" sembarang yang tidak punya verifikasi konten induk.
    .refine((val) => ALLOWED_MODULES.includes(val), {
      message: "Parameter module tidak valid",
    }),
  recordId: z
    .string({ required_error: "Parameter recordId wajib diisi" })
    .regex(UUID_PATTERN, "ID record harus berupa UUID yang valid"),
});

const videoIdParamSchema = z.object({
  id: z
    .string({ required_error: "Parameter ID video wajib diisi" })
    .regex(UUID_PATTERN, "ID video harus berupa UUID yang valid"),
});

module.exports = {
  ALLOWED_MODULES,
  videoParamsSchema,
  videoIdParamSchema,
};

