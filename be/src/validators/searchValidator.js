const { z } = require("zod");
const { cleanSearchTerm } = require("../utils/searchTerm");

// Batas kata kunci pencarian global.
const SEARCH_MIN = 2;
const SEARCH_MAX = 100;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 20;

// Karakter kontrol (termasuk NUL) dibuang karena PostgreSQL menolak NUL pada teks.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// q dibersihkan dengan cleanSearchTerm yang sama seperti pencarian modul lain
// (koma, kurung, kutip, backslash, % _ * diganti spasi) sebelum masuk filter PostgREST.
// Panjang dicek pada input asli (maks 100), lalu hasil bersih harus minimal 2 karakter.
const searchQuerySchema = z.object({
  q: z
    .string({ error: "Kata kunci pencarian (q) wajib diisi" })
    .trim()
    .min(1, "Kata kunci pencarian (q) wajib diisi")
    .max(SEARCH_MAX, `Kata kunci maksimal ${SEARCH_MAX} karakter`)
    .transform((value) => cleanSearchTerm(value.replace(CONTROL_CHARS, " ")))
    .pipe(
      z
        .string()
        .min(SEARCH_MIN, `Kata kunci minimal ${SEARCH_MIN} karakter (karakter khusus diabaikan)`)
    ),
  limit: z.coerce
    .number({ error: "limit harus berupa angka" })
    .int("limit harus berupa bilangan bulat")
    .min(1, "limit minimal 1")
    .max(LIMIT_MAX, `limit maksimal ${LIMIT_MAX}`)
    .default(LIMIT_DEFAULT),
});

module.exports = { searchQuerySchema, SEARCH_MIN, SEARCH_MAX, LIMIT_DEFAULT, LIMIT_MAX };
