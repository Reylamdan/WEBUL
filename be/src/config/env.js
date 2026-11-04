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

// ---------- JWT_EXPIRES_IN (opsional, contoh: 30m, 8h, 7d; default 8h) ----------
const jwtExpiresIn = read("JWT_EXPIRES_IN") || "8h";
if (!/^[1-9]\d*[mhd]$/.test(jwtExpiresIn)) {
  errors.push("JWT_EXPIRES_IN tidak valid (contoh: 30m, 8h, atau 7d).");
}

// ---------- GEMINI (opsional: hanya dibutuhkan untuk terjemahan konten dinamis) ----------
// Server tetap bisa berjalan tanpa dua variabel ini; endpoint terjemahan akan menjawab 503.
// Tidak ada model bawaan/fallback: model dipilih eksplisit lewat GEMINI_MODEL supaya tidak
// ada pergantian diam-diam ke model berbayar. Hanya model keluarga "Flash" yang diterima
// (pastikan model yang Anda pilih memang bertanda "Free of charge" di
// https://ai.google.dev/gemini-api/docs/pricing dan billing proyek AI Studio tetap nonaktif).
const geminiApiKey = read("GEMINI_API_KEY");
const geminiModel = read("GEMINI_MODEL");
if (geminiModel && !/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(geminiModel)) {
  errors.push(
    "GEMINI_MODEL tidak valid: hanya model Flash yang diizinkan (contoh: gemini-3.6-flash)."
  );
}

// ---------- GROQ (opsional: hanya dibutuhkan untuk terjemahan konten dinamis) ----------
// Server tetap bisa berjalan tanpa dua variabel ini; endpoint terjemahan akan menjawab 503.
// Tidak ada model bawaan/fallback: model dipilih eksplisit lewat GROQ_MODEL (lihat daftar model
// aktif di https://console.groq.com/docs/models) supaya tidak ada pergantian diam-diam.
const groqApiKey = read("GROQ_API_KEY");
const groqModel = read("GROQ_MODEL");
if (groqModel && !/^[a-z0-9][a-z0-9._\-/]{1,63}$/i.test(groqModel)) {
  errors.push("GROQ_MODEL tidak valid (contoh format: openai/gpt-oss-120b).");
}

// ---------- Provider terjemahan aktif ----------
// Dipilih eksplisit; TIDAK ada perpindahan otomatis ke provider lain. Default: groq.
// "gemini" hanya dipertahankan sementara selama masa migrasi (untuk rollback tanpa ubah kode).
const TRANSLATION_PROVIDERS = ["groq", "gemini"];
const translationProvider = (read("TRANSLATION_PROVIDER") || "groq").toLowerCase();
if (!TRANSLATION_PROVIDERS.includes(translationProvider)) {
  errors.push(`TRANSLATION_PROVIDER tidak valid (pilihan: ${TRANSLATION_PROVIDERS.join(", ")}).`);
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
  jwtExpiresIn,
  geminiApiKey,
  geminiModel,
  groqApiKey,
  groqModel,
  translationProvider,
});