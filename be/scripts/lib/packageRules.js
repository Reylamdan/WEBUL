// Aturan pemaketan aman untuk ZIP review/kerja.
// Tujuan: file rahasia (.env, kunci privat, kredensial) TIDAK PERNAH ikut ke ZIP,
// tetapi .env.example tetap disertakan sebagai dokumentasi variabel.
//
// Modul ini murni (tanpa I/O) supaya mudah diuji: scripts/testPackaging.js.

const path = require("node:path");

// Folder yang tidak pernah ikut dipaket (di mana pun posisinya).
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".vscode",
  ".idea",
  ".next",
  ".nuxt",
  ".cache",
  "coverage",
  "dist",
  "build",
  "out",
  "tmp",
  "temp",
  "logs",
]);

// Nama file rahasia (berlaku juga bila berada di subfolder).
const SECRET_BASENAMES = new Set([
  ".env",
  ".npmrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".netrc",
  "_netrc",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  "credentials.json",
  "client_secret.json",
  "service-account.json",
  "service_account.json",
  "google-credentials.json",
  "google_credentials.json",
  "gcloud-credentials.json",
  "gcloud_credentials.json",
  "auth.json",
  "secrets.json",
  "secret.json",
]);

// Ekstensi file kunci/sertifikat atau arsip (arsip tidak boleh bersarang).
const SECRET_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".crt",
  ".cer",
  ".csr",
  ".der",
  ".jks",
  ".keystore",
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".gz",
  ".tgz",
]);

// Pola nama yang jelas menandakan kredensial.
const SECRET_NAME_PATTERNS = [
  /^\.env\./i, // .env.local, .env.production, ...
  /^credentials.*\.json$/i,
  /^client[_-]?secret.*\.json$/i,
  /^service[_-]?account.*\.json$/i,
  /^.*google.*credential.*\.json$/i,
  /^npm-debug\.log/i,
  /^yarn-(debug|error)\.log/i,
  /^pnpm-debug\.log/i,
];

const OS_JUNK = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

// .env.example sengaja DIIZINKAN. Tidak ada pengecualian lain.
const SAFE_ENV_EXAMPLE = ".env.example";

const toPosix = (value) => String(value).replace(/\\/g, "/");

/**
 * Mengembalikan { excluded: true, reason } bila path relatif tidak boleh masuk ZIP.
 * Path harus relatif terhadap akar proyek.
 */
const classifyPath = (relativePath) => {
  const rel = toPosix(relativePath).replace(/^\.\//, "");
  if (!rel || rel === ".") return { excluded: true, reason: "path kosong" };

  const segments = rel.split("/").filter(Boolean);
  if (segments.some((segment) => EXCLUDED_DIRS.has(segment.toLowerCase()))) {
    return { excluded: true, reason: "folder tidak dipaket" };
  }

  const base = segments[segments.length - 1];
  if (base === SAFE_ENV_EXAMPLE) return { excluded: false, reason: "contoh env diizinkan" };
  if (SECRET_BASENAMES.has(base.toLowerCase())) return { excluded: true, reason: "nama file rahasia" };
  if (OS_JUNK.has(base)) return { excluded: true, reason: "file OS" };

  const ext = path.posix.extname(base).toLowerCase();
  if (SECRET_EXTENSIONS.has(ext)) return { excluded: true, reason: "ekstensi kunci/arsip" };
  if (SECRET_NAME_PATTERNS.some((pattern) => pattern.test(base))) {
    return { excluded: true, reason: "pola nama rahasia" };
  }

  return { excluded: false, reason: "" };
};

const isExcluded = (relativePath) => classifyPath(relativePath).excluded;

module.exports = {
  EXCLUDED_DIRS,
  SECRET_BASENAMES,
  SECRET_EXTENSIONS,
  SECRET_NAME_PATTERNS,
  OS_JUNK,
  SAFE_ENV_EXAMPLE,
  classifyPath,
  isExcluded,
  toPosix,
};
