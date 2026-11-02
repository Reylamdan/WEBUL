const { toPlainText } = require("./sanitizeHtml");

// Batas excerpt otomatis. Kolom database mengizinkan 1-500 karakter.
const AUTO_EXCERPT_LENGTH = 200;

// Akhir elemen blok diganti spasi agar teks antar paragraf/list tidak menempel ("satu</p><p>dua").
const BLOCK_END = /<\/(?:p|h[1-6]|li|ul|ol|blockquote)>|<br\s*\/?>/gi;

// Mengambil teks polos dari HTML artikel (yang sudah disanitasi).
const htmlToText = (html) => toPlainText(String(html ?? "").replace(BLOCK_END, " "));

// Membuat excerpt otomatis dari HTML artikel. Mengembalikan "" jika tidak ada teks.
// Dipotong di batas kata jika memungkinkan dan diakhiri "…".
const makeExcerpt = (html, maxLength = AUTO_EXCERPT_LENGTH) => {
  const text = htmlToText(html);
  const chars = Array.from(text); // Array.from agar emoji/karakter 2-unit tidak terpotong separuh
  if (chars.length <= maxLength) return text;

  let cut = chars.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace >= maxLength / 2) cut = cut.slice(0, lastSpace);

  return `${cut.join("").replace(/[\s.,;:!?-]+$/u, "")}…`;
};

module.exports = { htmlToText, makeExcerpt, AUTO_EXCERPT_LENGTH };
