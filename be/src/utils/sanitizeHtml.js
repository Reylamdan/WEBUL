const sanitizeHtml = require("sanitize-html");

// ---------------------------------------------------------------------
// 1. Isi artikel (content_html): HTML terbatas
// ---------------------------------------------------------------------
// Aturan:
// - Hanya tag artikel di allowedTags yang dipertahankan. Tag lain dibuang (teksnya tetap ada),
//   kecuali <script>, <style>, <textarea>, <option> yang dibuang BESERTA isinya.
// - <h1> diubah menjadi <h2>. <img> tidak diizinkan di Fase 2B.
// - Semua atribut dibuang (onclick, style, class, dll). Hanya <a> yang boleh punya href.
// - href hanya boleh http, https, mailto, tel, atau link relatif. javascript:, data:, vbscript:
//   dan URL protocol-relative (//host) dibuang.
// - Setiap <a> otomatis diberi rel="noopener noreferrer".
const ARTICLE_OPTIONS = {
  allowedTags: ["p", "h2", "h3", "h4", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "a", "br"],
  allowedAttributes: { a: ["href", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: attribs.href ? { href: attribs.href, rel: "noopener noreferrer" } : {},
    }),
  },
};

const sanitizeArticleHtml = (input) => sanitizeHtml(String(input ?? ""), ARTICLE_OPTIONS).trim();

// ---------------------------------------------------------------------
// 2. Teks polos (title, excerpt) dan teks dari HTML
// ---------------------------------------------------------------------
const PLAIN_OPTIONS = { allowedTags: [], allowedAttributes: {} };

// sanitize-html meng-escape teks hasilnya (& menjadi &amp; dst). Untuk teks polos kita
// kembalikan ke karakter aslinya, supaya "Tom & Jerry" tidak tersimpan sebagai "Tom &amp; Jerry".
const ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

// Mengubah input apa pun menjadi teks polos satu baris:
// tag dibuang, entitas didekode, karakter < dan > yang tersisa dihapus (agar tidak bisa
// membentuk tag jika suatu saat salah ditampilkan sebagai HTML), karakter kontrol dibuang,
// spasi berlebih dirapikan. Frontend tetap harus menampilkannya sebagai TEKS, bukan innerHTML.
const toPlainText = (input) => {
  const stripped = sanitizeHtml(String(input ?? ""), PLAIN_OPTIONS);
  return stripped
    .replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITY_MAP[entity])
    .replace(/[<>]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

module.exports = { sanitizeArticleHtml, toPlainText };
