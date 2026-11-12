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

// ---------- BACKEND_PUBLIC_URL (opsional) ----------
// Alamat publik API ini, dipakai untuk membentuk link preview/download dokumen (/api/files/...,
// /api/banpt-regulations/:id/document, dst.). Kosong = link relatif ("/api/..."), cukup jika frontend
// dan API satu origin atau frontend memakai proxy ke API. Jika frontend dan API berbeda domain,
// WAJIB diisi (contoh: https://api.universitaslia.ac.id), kalau tidak link akan menunjuk ke domain frontend.
const rawBackendPublicUrl = read("BACKEND_PUBLIC_URL");
let backendPublicUrl = "";
if (rawBackendPublicUrl) {
  try {
    const url = new URL(rawBackendPublicUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash) throw new Error();
    backendPublicUrl = rawBackendPublicUrl.replace(/\/+$/, "");
  } catch {
    errors.push("BACKEND_PUBLIC_URL bukan URL http/https yang valid (contoh: https://api.universitaslia.ac.id).");
  }
}

// ---------- GOOGLE DRIVE (penyimpanan dokumen akreditasi prodi & regulasi BAN-PT) ----------
// Opsional: tanpa konfigurasi ini server tetap berjalan, dokumen LAMA (Supabase Storage) tetap
// terbaca, tetapi unggah dokumen baru dijawab 503 STORAGE_NOT_CONFIGURED.
// Kredensial Service Account bisa diberikan lewat DUA cara (pilih salah satu):
//   a) GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY   (cocok untuk hosting tanpa file)
//   b) GOOGLE_SERVICE_ACCOUNT_KEY_FILE                      (path ke file JSON; cocok untuk lokal)
// Pesan error hanya menyebut NAMA variabel, tidak pernah nilainya.
const googleEmail = read("GOOGLE_SERVICE_ACCOUNT_EMAIL");
// Banyak hosting menyimpan newline pada private key sebagai teks "\n"; dinormalkan di sini.
const googlePrivateKey = read("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
const googleKeyFile = read("GOOGLE_SERVICE_ACCOUNT_KEY_FILE");
const googleRootFolderId = read("GOOGLE_DRIVE_ROOT_FOLDER_ID");
const googleDeleteMode = (read("GOOGLE_DRIVE_DELETE_MODE") || "trash").toLowerCase();

const GOOGLE_DELETE_MODES = ["trash", "delete"];
if (!GOOGLE_DELETE_MODES.includes(googleDeleteMode)) {
  errors.push(`GOOGLE_DRIVE_DELETE_MODE tidak valid (pilihan: ${GOOGLE_DELETE_MODES.join(", ")}).`);
}

const googleDriveRequested = Boolean(googleEmail || googlePrivateKey || googleKeyFile || googleRootFolderId);
let googleDriveEnabled = false;
if (googleDriveRequested) {
  const before = errors.length;

  if (!googleRootFolderId) {
    errors.push("GOOGLE_DRIVE_ROOT_FOLDER_ID belum diisi (konfigurasi Google Drive terisi sebagian).");
  } else if (!/^[A-Za-z0-9_-]{10,}$/.test(googleRootFolderId)) {
    errors.push("GOOGLE_DRIVE_ROOT_FOLDER_ID tidak valid (isi hanya ID folder, bukan URL).");
  }

  if (googleKeyFile && (googlePrivateKey || googleEmail)) {
    errors.push(
      "Pilih satu cara kredensial Google: GOOGLE_SERVICE_ACCOUNT_KEY_FILE atau GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY, jangan keduanya."
    );
  } else if (googleKeyFile) {
    if (!require("fs").existsSync(googleKeyFile)) {
      errors.push("GOOGLE_SERVICE_ACCOUNT_KEY_FILE menunjuk ke file yang tidak ditemukan.");
    }
  } else {
    if (!googleEmail) {
      errors.push("GOOGLE_SERVICE_ACCOUNT_EMAIL belum diisi (konfigurasi Google Drive terisi sebagian).");
    } else if (!/^[^\s@]+@[^\s@]+$/.test(googleEmail)) {
      errors.push("GOOGLE_SERVICE_ACCOUNT_EMAIL tidak valid.");
    }
    if (!googlePrivateKey) {
      errors.push("GOOGLE_PRIVATE_KEY belum diisi (konfigurasi Google Drive terisi sebagian).");
    } else if (!/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+-----END (?:RSA )?PRIVATE KEY-----/.test(googlePrivateKey)) {
      errors.push("GOOGLE_PRIVATE_KEY tidak valid (harus berformat PEM: -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----).");
    }
  }

  googleDriveEnabled = errors.length === before;
}

const googleDrive = Object.freeze({
  enabled: googleDriveEnabled,
  clientEmail: googleEmail,
  privateKey: googlePrivateKey,
  keyFile: googleKeyFile,
  rootFolderId: googleRootFolderId,
  deleteMode: googleDeleteMode,
});

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

// Peringatan (bukan error): di production, link dokumen relatif hanya benar jika frontend satu origin dengan API.
if (isProduction && googleDriveEnabled && !backendPublicUrl) {
  console.warn(
    "[KONFIGURASI] BACKEND_PUBLIC_URL kosong: link dokumen berbentuk relatif (/api/...). " +
      "Isi jika frontend dan API berada di domain berbeda."
  );
}

module.exports = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction,
  port,
  frontendOrigins,
  backendPublicUrl,
  googleDrive,
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