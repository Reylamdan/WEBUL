// Daftar kategori konten publik. Satu-satunya sumber: dipakai validator (admin & publik) dan
// endpoint GET /api/news/categories dan /api/announcements/categories.
// Kategori disimpan sebagai teks pada kolom `category` (nullable), jadi menambah kategori cukup
// mengubah daftar ini, tanpa migrasi database. Konten lama tanpa kategori (NULL) tetap tampil
// di daftar tanpa filter.
const NEWS_CATEGORIES = ["Kampus", "Prestasi", "Universitas"];
const ANNOUNCEMENT_CATEGORIES = ["Akademik", "Administrasi", "Kemahasiswaan"];

module.exports = { NEWS_CATEGORIES, ANNOUNCEMENT_CATEGORIES };
