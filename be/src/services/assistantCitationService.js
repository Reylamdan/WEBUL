// USULAN REVISI assistantCitationService.js (file terpisah; file asli TIDAK diganti).
// Perubahan terhadap versi asli (selain itu perilaku, bentuk objek sitasi, dedup, dan penomoran id TIDAK berubah):
//   1. `label` dan `title` pada sitasi disanitasi: karakter tersembunyi/kontrol dibuang, tag HTML dan
//      tanda < > dibuang, spasi dirapikan, maksimal 200 karakter. Jika hasilnya kosong dipakai label
//      bawaan (untuk title: label jenis sumber).
//   2. URL knowledge diperketat: hanya https://, hostname PERSIS universitaslia.ac.id atau
//      www.universitaslia.ac.id, tanpa username/password, tanpa port non-standar, tanpa spasi/karakter
//      kontrol/backslash. URL yang dikirim ke frontend adalah teks ASLI dari sumber (tidak dinormalisasi
//      ulang oleh `new URL().toString()`), sehingga tidak berubah menjadi URL lain.
//
// TODO (integrasi frontend): pola URL SOURCE_CONFIG di bawah (`/api/...`) sengaja belum diubah; tetapkan pola
//   URL halaman publik berita/pengumuman/kalender/akreditasi setelah frontend selesai.
// Catatan: `id` kalender/akreditasi diasumsikan string (UUID). Jika bertipe lain, sitasinya null (lihat
//   isValidIdentifier). Skema produksi belum terverifikasi -- lihat laporan.

const SITE_BASE_URL = "https://universitaslia.ac.id";

const OFFICIAL_HOSTNAMES = new Set(["universitaslia.ac.id", "www.universitaslia.ac.id"]);
const MAX_DISPLAY_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
const DEFAULT_KNOWLEDGE_LABEL = "Informasi Resmi Universitas LIA";

const SOURCE_CONFIG = {
  news: {
    label: "Berita Universitas LIA",
    buildPath: (source) =>
      `/api/news/${encodeURIComponent(source.slug)}`,
  },

  announcement: {
    label: "Pengumuman Universitas LIA",
    buildPath: (source) =>
      `/api/announcements/${encodeURIComponent(source.slug)}`,
  },

  academic_calendar: {
    label: "Kalender Akademik Universitas LIA",
    buildPath: (source) =>
      `/api/academic-calendar/${encodeURIComponent(source.id)}`,
  },

  accreditation_institution: {
    label: "Akreditasi Institusi Universitas LIA",
    buildPath: (source) =>
      `/api/accreditation/institutions/${encodeURIComponent(source.id)}`,
  },

  accreditation_study_program: {
    label: "Akreditasi Program Studi Universitas LIA",
    buildPath: (source) =>
      `/api/accreditation/study-programs/${encodeURIComponent(source.id)}`,
  },
};

// ---------------------------------------------------------------------
// Sanitasi teks tampilan (label/title). Daftar karakter tersembunyi identik dengan
// assistantGeminiService/assistantRetrievalService (kesamaannya diuji); file ini sengaja tanpa dependensi.
// ---------------------------------------------------------------------
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const HIDDEN_FORMAT_CHARS =
  /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ￹-￻\u{E0000}-\u{E0FFF}]/gu;

// Tidak mendekode entitas: "&lt;" tetap teks literal, sehingga tidak pernah menjadi tag walau frontend
// salah merender sebagai HTML. Frontend tetap harus merender sebagai TEKS.
const sanitizeDisplayText = (value, maxLength = MAX_DISPLAY_LENGTH) => {
  if (typeof value !== "string") return "";

  const text = value
    .replace(HIDDEN_FORMAT_CHARS, "")
    .replace(CONTROL_CHARS, " ")
    .replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
    // Tag = "<" diikuti huruf, "/", "!" atau "?" ; tanda < > lain (mis. "a < b") hanya dibuang tandanya.
    .replace(/<[/!?]?[a-z][^<>]*>|<[/!?][^<>]*>/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Array.from agar pasangan surrogate (emoji) tidak terpotong separuh.
  return Array.from(text).slice(0, maxLength).join("").trim();
};

// ---------------------------------------------------------------------
// URL knowledge: hanya URL resmi apa adanya.
// ---------------------------------------------------------------------
const toOfficialUrl = (value) => {
  if (typeof value !== "string") return null;

  const text = value.trim();

  if (!text || text.length > MAX_URL_LENGTH) return null;
  // Harus diawali "https://" persis; tanpa spasi, karakter kontrol/tersembunyi, atau backslash
  // (parser URL memperlakukan "\" seperti "/", sehingga bisa dipakai menyamarkan host).
  if (!/^https:\/\//i.test(text)) return null;
  if (/[\s\\]/.test(text)) return null;
  if (text !== text.replace(HIDDEN_FORMAT_CHARS, "").replace(CONTROL_CHARS, "")) return null;

  let parsed;

  try {
    parsed = new URL(text);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (!OFFICIAL_HOSTNAMES.has(parsed.hostname)) return null;
  if (parsed.username || parsed.password) return null;
  // Port default (443) dinormalkan parser menjadi "", port lain ditolak.
  if (parsed.port !== "") return null;

  // Teks asli dikembalikan, bukan parsed.toString().
  return text;
};

const isValidIdentifier = (value) =>
  typeof value === "string" &&
  value.trim().length > 0;

const buildCitation = (source, index) => {
  if (!source || typeof source !== "object") {
    return null;
  }

  const config = SOURCE_CONFIG[source.type];

  if (config) {
    if (
      ["news", "announcement"].includes(source.type) &&
      !isValidIdentifier(source.slug)
    ) {
      return null;
    }

    if (
      !["news", "announcement"].includes(source.type) &&
      !isValidIdentifier(source.id)
    ) {
      return null;
    }

    const path = config.buildPath(source);

    return {
      id: `source-${index + 1}`,
      type: source.type,
      label: config.label,
      title: sanitizeDisplayText(source.title) || config.label,
      url: `${SITE_BASE_URL}${path}`,
      publishedAt: source.publishedAt || null,
      startDate: source.startDate || null,
      endDate: source.endDate || null,
    };
  }

  if (source.type === "knowledge") {
    const citation = {
      id: `source-${index + 1}`,
      type: "knowledge",
      label: sanitizeDisplayText(source.sourceLabel) || DEFAULT_KNOWLEDGE_LABEL,
      title: sanitizeDisplayText(source.title) || DEFAULT_KNOWLEDGE_LABEL,
      publishedAt: null,
    };

    // sourcePath hanya menjadi URL jika https di domain resmi Universitas LIA
    // (lihat toOfficialUrl). Path internal atau URL lain tidak ditampilkan.
    const url = toOfficialUrl(source.sourcePath);

    if (url) {
      citation.url = url;
    }

    return citation;
  }

  return null;
};

const buildCitations = (sources) => {
  if (!Array.isArray(sources)) {
    return [];
  }

  const seen = new Set();

  return sources
    .map((source, index) => buildCitation(source, index))
    .filter(Boolean)
    .filter((citation) => {
      const key = `${citation.type}:${citation.title}:${citation.url || ""}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

module.exports = {
  buildCitation,
  buildCitations,
  // Diekspor untuk pengujian.
  sanitizeDisplayText,
  toOfficialUrl,
};
