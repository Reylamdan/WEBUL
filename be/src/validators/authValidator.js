const { z } = require("zod");
const { MAX_PASSWORD_BYTES, isWithinBcryptLimit } = require("../utils/password");

// Email selalu disimpan dan dicari dalam huruf kecil.
const emailField = z
  .string({ error: "Email wajib diisi" })
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi")
  .max(254, "Email terlalu panjang")
  .pipe(z.email({ error: "Format email tidak valid" }));

// Untuk LOGIN: tidak menerapkan aturan kekuatan password, hanya memastikan ada isinya.
const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Password wajib diisi" })
    .min(1, "Password wajib diisi")
    .refine(isWithinBcryptLimit, `Password maksimal ${MAX_PASSWORD_BYTES} byte`),
});

// Untuk MEMBUAT admin (dipakai script seed): aturan kekuatan password diterapkan di sini.
const createAdminSchema = z.object({
  name: z
    .string({ error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: emailField,
  password: z
    .string({ error: "Password wajib diisi" })
    .min(10, "Password minimal 10 karakter")
    .refine(isWithinBcryptLimit, `Password maksimal ${MAX_PASSWORD_BYTES} byte`)
    .refine((value) => /[A-Za-z]/.test(value), "Password harus memuat minimal satu huruf")
    .refine((value) => /\d/.test(value), "Password harus memuat minimal satu angka"),
});

module.exports = { loginSchema, createAdminSchema };