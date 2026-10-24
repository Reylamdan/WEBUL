// Memuat dan memvalidasi environment variables.
// File ini harus di-require paling awal, sebelum modul lain yang membaca process.env.
require("dotenv").config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const errors = [];

// Mengambil nilai env sebagai string yang sudah di-trim (atau "" jika tidak ada)
const read = (name) => (process.env[name] || "").trim();

// ---------- PORT ----------
const rawPort = read("PORT") || "5000";
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  errors.push("PORT harus berupa angka bulat antara 1 sampai 65535.");
}

// ---------- FRONTEND_URL (boleh lebih dari satu, pisahkan dengan koma) ----------
const rawFrontendUrl = read("FRONTEND_URL");
let frontendOrigins = [];

if (!rawFrontendUrl) {
  if (isProduction) {
    errors.push("FRONTEND_URL wajib diisi saat NODE_ENV=production.");
  } else {
    // Fallback hanya untuk development lokal
    frontendOrigins = ["http://localhost:3000"];
  }
} else {
  for (const item of rawFrontendUrl.split(",")) {
    const value = item.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      frontendOrigins.push(url.origin); // origin = tanpa path dan tanpa slash di akhir
    } catch {
      errors.push(
        "FRONTEND_URL berisi URL yang tidak valid (contoh: http://localhost:3000)."
      );
      break;
    }
  }
}

// ---------- SUPABASE ----------
const supabaseUrl = read("SUPABASE_URL");
if (!supabaseUrl) {
  errors.push("SUPABASE_URL belum diisi.");
} else {
  try {
    const url = new URL(supabaseUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    errors.push("SUPABASE_URL bukan URL yang valid.");
  }
}

const supabaseServiceRoleKey = read("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseServiceRoleKey) {
  errors.push("SUPABASE_SERVICE_ROLE_KEY belum diisi.");
}

// ---------- JWT ----------
const jwtSecret = read("JWT_SECRET");
if (!jwtSecret) {
  errors.push("JWT_SECRET belum diisi.");
} else if (jwtSecret.length < 32) {
  errors.push("JWT_SECRET terlalu pendek (minimal 32 karakter).");
}

// ---------- Hentikan server jika ada yang salah ----------
// Pesan hanya menyebut NAMA variabel, tidak pernah menampilkan nilainya.
if (errors.length > 0) {
  console.error("\n[KONFIGURASI] Server tidak dapat dijalankan:");
  for (const message of errors) console.error(` - ${message}`);
  console.error(
    "\nPeriksa file .env (lihat .env.example untuk daftar variabel yang dibutuhkan).\n"
  );
  process.exit(1);
}

module.exports = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction,
  port,
  frontendOrigins,
  supabaseUrl,
  supabaseServiceRoleKey,
  jwtSecret,
});