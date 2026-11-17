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
    frontendOrigins = ["http://localhost:3000"];
  }
} else {
  for (const item of rawFrontendUrl.split(",")) {
    const value = item.trim();
    if (!value) continue;

    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      frontendOrigins.push(url.origin);
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

// ---------- JWT_EXPIRES_IN ----------
const jwtExpiresIn = read("JWT_EXPIRES_IN") || "8h";

if (!/^[1-9]\d*[mhd]$/.test(jwtExpiresIn)) {
  errors.push("JWT_EXPIRES_IN tidak valid (contoh: 30m, 8h, atau 7d).");
}

// ---------- GEMINI ----------
const geminiApiKey = read("GEMINI_API_KEY");
const geminiModel = read("GEMINI_MODEL");

if (
  geminiModel &&
  !/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(geminiModel)
) {
  errors.push(
    "GEMINI_MODEL tidak valid: hanya model Flash yang diizinkan."
  );
}

// ---------- GROQ ----------
const groqApiKey = read("GROQ_API_KEY");
const groqModel = read("GROQ_MODEL");

if (groqModel && !/^[a-z0-9][a-z0-9._\-/]{1,63}$/i.test(groqModel)) {
  errors.push("GROQ_MODEL tidak valid.");
}

// ---------- PROVIDER TERJEMAHAN ----------
const TRANSLATION_PROVIDERS = ["groq", "gemini"];
const translationProvider = (read("TRANSLATION_PROVIDER") || "groq").toLowerCase();

if (!TRANSLATION_PROVIDERS.includes(translationProvider)) {
  errors.push(
    `TRANSLATION_PROVIDER tidak valid (pilihan: ${TRANSLATION_PROVIDERS.join(", ")}).`
  );
}

// ---------- BACKEND_PUBLIC_URL ----------
const rawBackendPublicUrl = read("BACKEND_PUBLIC_URL");
let backendPublicUrl = "";

if (rawBackendPublicUrl) {
  try {
    const url = new URL(rawBackendPublicUrl);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }

    backendPublicUrl = rawBackendPublicUrl.replace(/\/+$/, "");
  } catch {
    errors.push(
      "BACKEND_PUBLIC_URL bukan URL http/https yang valid."
    );
  }
}

// ---------- GOOGLE DRIVE OAUTH 2.0 ----------
// Google Drive HANYA memakai OAuth 2.0 akun Google pribadi admin (Service Account tidak didukung).
// Refresh token disimpan terenkripsi di Supabase. Konfigurasi bersifat opsional agar server tetap
// dapat berjalan sebelum akun Google dihubungkan; jika salah satu variabel OAuth diisi, semuanya wajib valid.

const { parseEncryptionKey } = require("../utils/tokenCrypto");
const { validateFrontendRedirect } = require("../utils/safeRedirect");

const GOOGLE_CALLBACK_PATH = "/api/admin/google-drive/callback";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const googleAuthMode = read("GOOGLE_AUTH_MODE").toLowerCase();

if (googleAuthMode === "service_account") {
  errors.push(
    "GOOGLE_AUTH_MODE=service_account tidak lagi didukung; Google Drive hanya memakai OAuth (GOOGLE_AUTH_MODE=oauth)."
  );
} else if (googleAuthMode && googleAuthMode !== "oauth") {
  errors.push("GOOGLE_AUTH_MODE tidak valid (pilihan: oauth).");
}

const googleOAuthClientId = read("GOOGLE_OAUTH_CLIENT_ID");
const googleOAuthClientSecret = read("GOOGLE_OAUTH_CLIENT_SECRET");
const googleOAuthRedirectUri = read("GOOGLE_OAUTH_REDIRECT_URI");
const googleOAuthRootFolderId = read("GOOGLE_DRIVE_ROOT_FOLDER_ID");
const googleOAuthEncryptionRaw = read("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY");
// Nama lama; hanya dipakai untuk memberi petunjuk, nilainya tidak pernah dibaca atau ditampilkan.
const legacyEncryptionKeyName = Boolean(read("GOOGLE_OAUTH_ENCRYPTION_KEY"));
const rawFrontendRedirect = read("GOOGLE_OAUTH_FRONTEND_REDIRECT");

const googleDeleteMode = (
  read("GOOGLE_DRIVE_DELETE_MODE") || "trash"
).toLowerCase();

const GOOGLE_DELETE_MODES = ["trash", "delete"];

if (!GOOGLE_DELETE_MODES.includes(googleDeleteMode)) {
  errors.push(
    "GOOGLE_DRIVE_DELETE_MODE tidak valid (pilihan: trash, delete)."
  );
}

// Variabel Service Account lama tidak membuat server berhenti, tetapi diabaikan sepenuhnya.
const ignoredServiceAccountVars = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY_FILE",
].filter((name) => read(name));

// Kunci enkripsi untuk menyimpan refresh token.
let googleOAuthEncryptionKey = null;

if (googleOAuthEncryptionRaw) {
  // parseEncryptionKey TIDAK melempar error: ia mengembalikan null bila bentuk kunci salah.
  // Hasil null harus ditolak di sini; jika tidak, OAuth dianggap aktif dengan kunci kosong dan
  // baru gagal saat pemakaian pertama (createTokenCrypto melempar "Kunci enkripsi harus tepat 32 byte").
  googleOAuthEncryptionKey = parseEncryptionKey(googleOAuthEncryptionRaw);

  if (!googleOAuthEncryptionKey) {
    errors.push(
      "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY tidak valid (harus berupa hex atau base64 yang menghasilkan 32 byte)."
    );
  }
}

// Masa berlaku state OAuth dalam detik.
const googleOAuthStateTtl = Number(
  read("GOOGLE_OAUTH_STATE_TTL_SECONDS") || "600"
);

// Tujuan redirect ke frontend setelah callback (opsional). Tidak pernah berasal dari request.
let googleOAuthFrontendRedirect = "";

if (rawFrontendRedirect) {
  const check = validateFrontendRedirect(rawFrontendRedirect, {
    allowedOrigins: frontendOrigins,
    isProduction,
  });

  if (check.ok) {
    googleOAuthFrontendRedirect = check.url;
  } else {
    errors.push(`GOOGLE_OAUTH_FRONTEND_REDIRECT tidak valid: ${check.reason}.`);
  }
}

let googleOAuthEnabled = false;

const googleOAuthRequested = Boolean(
  googleAuthMode === "oauth" ||
    googleOAuthClientId ||
    googleOAuthClientSecret ||
    googleOAuthRedirectUri ||
    googleOAuthRootFolderId ||
    googleOAuthEncryptionRaw ||
    legacyEncryptionKeyName
);

if (googleOAuthRequested) {
  const before = errors.length;

  if (!googleOAuthClientId) {
    errors.push("GOOGLE_OAUTH_CLIENT_ID belum diisi.");
  }

  if (!googleOAuthClientSecret) {
    errors.push("GOOGLE_OAUTH_CLIENT_SECRET belum diisi.");
  }

  if (!googleOAuthRedirectUri) {
    errors.push("GOOGLE_OAUTH_REDIRECT_URI belum diisi.");
  } else {
    let redirectValid = false;

    try {
      const url = new URL(googleOAuthRedirectUri);
      const isLocal = LOCAL_HOSTS.has(url.hostname);

      redirectValid =
        (url.protocol === "https:" ||
          (url.protocol === "http:" && isLocal && !isProduction)) &&
        url.pathname === GOOGLE_CALLBACK_PATH &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password &&
        !googleOAuthRedirectUri.includes("?") &&
        !googleOAuthRedirectUri.includes("#");
    } catch {
      redirectValid = false;
    }

    if (!redirectValid) {
      errors.push(
        `GOOGLE_OAUTH_REDIRECT_URI tidak valid: harus https (http hanya untuk localhost di luar production), ` +
          `berakhir tepat di ${GOOGLE_CALLBACK_PATH}, tanpa query atau fragment.`
      );
    }
  }

  if (!googleOAuthRootFolderId) {
    errors.push("GOOGLE_DRIVE_ROOT_FOLDER_ID belum diisi.");
  } else if (!/^[A-Za-z0-9_-]{10,}$/.test(googleOAuthRootFolderId)) {
    errors.push(
      "GOOGLE_DRIVE_ROOT_FOLDER_ID tidak valid (isi hanya ID folder, bukan URL)."
    );
  }

  if (!googleOAuthEncryptionRaw) {
    errors.push(
      legacyEncryptionKeyName
        ? "GOOGLE_OAUTH_ENCRYPTION_KEY sudah diganti namanya menjadi GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY; ubah nama variabel di .env."
        : "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY belum diisi."
    );
  }
  // Format kunci yang salah sudah dicatat saat parsing di atas.

  if (
    !Number.isInteger(googleOAuthStateTtl) ||
    googleOAuthStateTtl < 60 ||
    googleOAuthStateTtl > 1800
  ) {
    errors.push(
      "GOOGLE_OAUTH_STATE_TTL_SECONDS harus antara 60 sampai 1800."
    );
  }

  googleOAuthEnabled = errors.length === before;
}

const googleOAuth = Object.freeze({
  enabled: googleOAuthEnabled,
  clientId: googleOAuthClientId,
  clientSecret: googleOAuthClientSecret,
  redirectUri: googleOAuthRedirectUri,
  rootFolderId: googleOAuthRootFolderId,
  encryptionKey: googleOAuthEncryptionKey,
  stateTtlSeconds: googleOAuthStateTtl,
  frontendRedirect: googleOAuthFrontendRedirect,
});

// Konfigurasi yang digunakan oleh Google Drive Service.
// Access token diperoleh dari Google OAuth Service.
const googleDrive = Object.freeze({
  authMode: googleOAuthEnabled ? "oauth" : "none",
  enabled: googleOAuthEnabled,
  rootFolderId: googleOAuthRootFolderId,
  deleteMode: googleDeleteMode,
});

// ---------- CLOUDINARY (video) ----------
const cloudinaryCloudName = read("CLOUDINARY_CLOUD_NAME");
const cloudinaryApiKey = read("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = read("CLOUDINARY_API_SECRET");
const cloudinaryRootFolder = read("CLOUDINARY_ROOT_FOLDER") || "universitas-lia";

const cloudinary = Object.freeze({
  enabled: Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret),
  cloudName: cloudinaryCloudName,
  apiKey: cloudinaryApiKey,
  apiSecret: cloudinaryApiSecret,
  rootFolder: cloudinaryRootFolder.replace(/^\/+|\/+$/g, ""),
});

// Kosong = pakai default di videoValidator.js
const cloudinaryVideo = Object.freeze({
  maxBytes: Number(read("CLOUDINARY_VIDEO_MAX_BYTES")) || undefined,
  maxDurationSeconds: Number(read("CLOUDINARY_VIDEO_MAX_DURATION_SECONDS")) || undefined,
});

// ---------- HENTIKAN SERVER JIKA ADA YANG SALAH ----------
if (errors.length > 0) {
  console.error("\n[KONFIGURASI] Server tidak dapat dijalankan:");

  for (const message of errors) {
    console.error(` - ${message}`);
  }

  console.error(
    "\nPeriksa file .env (lihat .env.example untuk daftar variabel yang dibutuhkan).\n"
  );

  process.exit(1);
}

// Diagnostik status Google Drive saat start. Hanya NAMA variabel yang dicetak, tidak pernah nilainya.
// Tanpa ini, OAuth yang nonaktif (tidak ada variabel terbaca) hanya terlihat sebagai
// 503 STORAGE_NOT_CONFIGURED saat admin mengunggah dokumen.
if (NODE_ENV !== "test") {
  if (googleOAuthEnabled) {
    // stderr (bukan console.log): stdout tidak boleh tercemar oleh skrip yang membaca keluaran proses.
    console.warn(
      "[KONFIGURASI] Google Drive OAuth: AKTIF. Akun Google dihubungkan sekali lewat panel admin " +
        "(POST /api/admin/google-drive/connect); cek status di GET /api/admin/google-drive/status."
    );
  } else {
    const envFile = require("node:path").resolve(process.cwd(), ".env");
    const envFileFound = require("node:fs").existsSync(envFile);
    const missing = [
      ["GOOGLE_OAUTH_CLIENT_ID", googleOAuthClientId],
      ["GOOGLE_OAUTH_CLIENT_SECRET", googleOAuthClientSecret],
      ["GOOGLE_OAUTH_REDIRECT_URI", googleOAuthRedirectUri],
      ["GOOGLE_DRIVE_ROOT_FOLDER_ID", googleOAuthRootFolderId],
      ["GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", googleOAuthEncryptionRaw],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    console.warn(
      `[KONFIGURASI] Google Drive OAuth: NONAKTIF, unggah dokumen akan dijawab 503 STORAGE_NOT_CONFIGURED. ` +
        `File .env yang dicari: ${envFile} (${envFileFound ? "ditemukan" : "TIDAK ditemukan; jalankan server dari folder be"}). ` +
        `Variabel belum terbaca: ${missing.join(", ")}. ` +
        `Isi variabel tersebut lalu MULAI ULANG server (perubahan .env tidak dibaca ulang otomatis).`
    );
  }
}

// Peringatan (tidak menghentikan server).
if (ignoredServiceAccountVars.length > 0) {
  console.warn(
    `[KONFIGURASI] ${ignoredServiceAccountVars.join(", ")} diabaikan: Google Drive hanya memakai OAuth 2.0.`
  );
}

if (isProduction && googleDrive.enabled && !backendPublicUrl) {
  console.warn(
    "[KONFIGURASI] BACKEND_PUBLIC_URL kosong: link dokumen berbentuk relatif (/api/...). " +
      "Isi jika frontend dan API berada di domain berbeda."
  );
}

// ---------- EXPORT ----------
module.exports = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction,
  port,
  frontendOrigins,
  backendPublicUrl,

  googleDrive,
  googleOAuth,

  cloudinary,
  cloudinaryVideo,

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