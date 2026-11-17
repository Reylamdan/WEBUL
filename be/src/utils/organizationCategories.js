// Kategori Struktur Organisasi. Satu-satunya sumber untuk validator, serializer, dan endpoint kategori.
const ORGANIZATION_CATEGORIES = [
  { slug: "bagan", name: "Bagan Organisasi", description: "Gambar bagan struktur organisasi universitas" },
  { slug: "unit", name: "Unit dan Pimpinan", description: "Kartu unit kerja, pimpinan, atau organ pendukung" },
];

const ORGANIZATION_CATEGORY_SLUGS = ORGANIZATION_CATEGORIES.map((c) => c.slug);
const ORGANIZATION_CATEGORY_MAP = new Map(ORGANIZATION_CATEGORIES.map((c) => [c.slug, c]));

module.exports = { ORGANIZATION_CATEGORIES, ORGANIZATION_CATEGORY_SLUGS, ORGANIZATION_CATEGORY_MAP };
