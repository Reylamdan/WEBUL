const env = require("../config/env");

// Fasad provider-neutral untuk penerjemahan. Controller hanya mengenal file ini:
//   translateFields(fields, options)  -> { targetLang, model, translation }
//   isConfigured()                    -> boolean
//
// Provider dipilih EKSPLISIT lewat TRANSLATION_PROVIDER (default: groq). Tidak ada perpindahan
// otomatis antar provider: kalau provider terpilih gagal atau kuotanya habis, errornya dikembalikan
// apa adanya. Untuk menambah provider baru: buat service dengan kontrak yang sama, lalu daftarkan
// di REGISTRY di bawah dan di env.js (TRANSLATION_PROVIDERS).
//
// "gemini" dipertahankan sementara selama masa migrasi/pengujian (rollback = ubah env, bukan kode).

const REGISTRY = {
  groq: {
    load: () => require("./groqTranslator"),
    notConfiguredMessage: "Layanan terjemahan belum dikonfigurasi (GROQ_API_KEY dan GROQ_MODEL).",
  },
  gemini: {
    load: () => require("./geminiTranslator"),
    notConfiguredMessage: "Layanan terjemahan belum dikonfigurasi (GEMINI_API_KEY dan GEMINI_MODEL).",
  },
};

const active = () => REGISTRY[env.translationProvider];

const translateFields = (fields, options) => active().load().translateFields(fields, options);
const isConfigured = () => active().load().isConfigured();
const getNotConfiguredMessage = () => active().notConfiguredMessage;

// Label provider yang disimpan di kolom content_translations.provider, format "<provider>:<model>".
// Model berawalan "gemini-" selalu berlabel gemini, supaya terjemahan lama tetap konsisten.
const providerLabelForModel = (model) => (/^gemini-/i.test(model) ? "gemini" : env.translationProvider);

module.exports = { translateFields, isConfigured, getNotConfiguredMessage, providerLabelForModel };
