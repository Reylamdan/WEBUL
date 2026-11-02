// Batas dan format ini HARUS sama dengan constraint news_slug_format di database:
//   slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' dan panjang <= 150
const SLUG_MAX_LENGTH = 150;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_FALLBACK = "berita";

const trimHyphens = (value) => value.replace(/^-+|-+$/g, "");

// "Wisuda Periode Oktober 2026!" -> "wisuda-periode-oktober-2026"
// Huruf beraksen diubah ke huruf dasar ("Café" -> "cafe"). Judul tanpa huruf/angka sama sekali
// (misalnya hanya simbol atau emoji) menghasilkan "berita".
const slugify = (text, maxLength = SLUG_MAX_LENGTH, fallback = SLUG_FALLBACK) => {
  const slug = trimHyphens(
    String(text ?? "")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
  );
  const cut = trimHyphens(slug.slice(0, maxLength));
  return cut || fallback;
};

// Menambah sufiks tanpa melewati batas panjang: ("wisuda", "2") -> "wisuda-2"
const withSuffix = (base, suffix, fallback = SLUG_FALLBACK) => {
  const tail = `-${suffix}`;
  const head = trimHyphens(base.slice(0, SLUG_MAX_LENGTH - tail.length)) || fallback;
  return `${head}${tail}`;
};

module.exports = { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify, withSuffix, SLUG_FALLBACK };
