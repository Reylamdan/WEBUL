// Enkripsi AES-256-GCM untuk rahasia OAuth yang disimpan di database (refresh token, PKCE code_verifier).
//
// Format tersimpan:  v1.<iv>.<authTag>.<ciphertext>   (semua base64url)
//   - IV acak 12 byte untuk SETIAP enkripsi (tidak pernah dipakai ulang).
//   - AAD (additional authenticated data) mengikat ciphertext ke KONTEKS-nya (mis. "refresh-token"), sehingga
//     ciphertext yang ditukar antar kolom/baris/tujuan gagal diverifikasi.
//   - Awalan "v1" memungkinkan rotasi/migrasi format di masa depan tanpa menebak-nebak data lama.
//
// Modul ini TIDAK membaca env dan TIDAK pernah mencatat (log) plaintext, kunci, atau ciphertext.
const crypto = require("node:crypto");

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Error generik: pesan tidak memuat data apa pun dari input.
class TokenCryptoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TokenCryptoError";
    this.code = code;
  }
}

// Kunci boleh berupa 64 karakter hex ATAU base64/base64url yang terdekode menjadi tepat 32 byte.
// Mengembalikan Buffer, atau null jika bentuknya tidak valid.
const parseEncryptionKey = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  let buffer = null;
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    buffer = Buffer.from(value, "hex");
  } else if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) {
    buffer = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  }
  return buffer && buffer.length === KEY_BYTES ? buffer : null;
};

const b64 = (buffer) => buffer.toString("base64url");

const createTokenCrypto = (key) => {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new TokenCryptoError("INVALID_KEY", "Kunci enkripsi harus tepat 32 byte");
  }

  const encrypt = (plaintext, aad = "") => {
    if (typeof plaintext !== "string" || plaintext.length === 0) {
      throw new TokenCryptoError("INVALID_INPUT", "Teks yang dienkripsi harus berupa string tidak kosong");
    }
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(Buffer.from(String(aad), "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [VERSION, b64(iv), b64(cipher.getAuthTag()), b64(ciphertext)].join(".");
  };

  const decrypt = (blob, aad = "") => {
    const parts = typeof blob === "string" ? blob.split(".") : [];
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new TokenCryptoError("DECRYPT_FAILED", "Data terenkripsi tidak dapat dibaca");
    }
    try {
      const iv = Buffer.from(parts[1], "base64url");
      const tag = Buffer.from(parts[2], "base64url");
      const ciphertext = Buffer.from(parts[3], "base64url");
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error("panjang tidak valid");
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      decipher.setAAD(Buffer.from(String(aad), "utf8"));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      // Kunci salah, data diubah, atau AAD berbeda: semuanya satu pesan generik.
      throw new TokenCryptoError("DECRYPT_FAILED", "Data terenkripsi tidak dapat dibaca");
    }
  };

  return { encrypt, decrypt };
};

module.exports = { createTokenCrypto, parseEncryptionKey, TokenCryptoError, KEY_BYTES };
