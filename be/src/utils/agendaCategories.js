// Kategori Agenda Acara. Satu-satunya sumber: dipakai validator, serializer, dan endpoint
// GET /api/agenda-events/categories. Menambah kategori cukup mengubah daftar ini (tanpa migrasi).
// "Semua Acara" BUKAN kategori: itu hanya pilihan filter default di frontend.
const AGENDA_CATEGORIES = [
  { slug: "seminar-webinar", name: "Seminar & Webinar", description: "Kuliah tamu, konferensi, bedah buku" },
  { slug: "workshop-pelatihan", name: "Workshop & Pelatihan", description: "Pengembangan skill, karier, sertifikasi" },
  { slug: "kemahasiswaan-ukm", name: "Kemahasiswaan & UKM", description: "Acara BEM, himpunan, pentas seni, olahraga" },
  { slug: "lomba-kompetisi", name: "Lomba & Kompetisi", description: "Perlombaan tingkat kampus maupun nasional" },
  { slug: "pengabdian-masyarakat", name: "Pengabdian Masyarakat", description: "Kegiatan LPPM dan bakti sosial" },
  { slug: "seremonial-umum", name: "Seremonial & Umum", description: "Dies Natalis, Open House PMB, perayaan hari besar" },
  { slug: "lainnya", name: "Lainnya", description: "Acara di luar kategori lain" },
];

const AGENDA_CATEGORY_SLUGS = AGENDA_CATEGORIES.map((c) => c.slug);
const AGENDA_CATEGORY_MAP = new Map(AGENDA_CATEGORIES.map((c) => [c.slug, c]));

module.exports = { AGENDA_CATEGORIES, AGENDA_CATEGORY_SLUGS, AGENDA_CATEGORY_MAP };