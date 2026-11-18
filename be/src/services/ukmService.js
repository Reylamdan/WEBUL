const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "ukm_settings";
const ITEMS_TABLE = "ukm_items";

const DEFAULT_UKM_SETTINGS = {
  heroEyebrow: "ORGANISASI & KOMUNITAS",
  heroTitle: "Kegiatan Mahasiswa (UKM)",
  heroSubtitle:
    "Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas.",
  heroBadge: "Universitas LIA — Komunitas & UKM",
  introEyebrow: "KOMUNITAS MAHASISWA",
  introTitle: "Temukan komunitas yang sesuai dengan minatmu",
  introDescription:
    "UKM menjadi ruang untuk belajar bersama, mengasah kemampuan, dan menciptakan pengalaman kampus yang berkesan.",
  categoryTitle: "Jelajahi bidang kegiatan",
  categoryDesc: "Pilih bidang yang paling dekat dengan minat dan ketertarikanmu.",
  cardsTitle: "Kenali komunitas mahasiswa",
  cardsDesc:
    "Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi setelah data resmi tersedia.",
  ctaTitle: "Tertarik bergabung dengan UKM?",
  ctaDescription:
    "Informasi kontak, jadwal open recruitment, dan tautan pendaftaran akan ditambahkan di sini.",
  ctaButtonLabel: "Informasi Pendaftaran",
  modalTitle: "Pendaftaran Kegiatan Mahasiswa (UKM)",
  modalSubtitle: "Informasi Open Recruitment Universitas LIA",
  modalScheduleText:
    "Pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik.",
  modalRequirementsText:
    "Mahasiswa aktif Universitas LIA dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa.",
  modalContactEmail: "kemahasiswaan@universitaslia.ac.id",
};

const DEFAULT_UKM_CATEGORIES = [
  { id: "seni", label: "Seni & Kreativitas" },
  { id: "olahraga", label: "Olahraga" },
  { id: "teknologi", label: "Teknologi" },
  { id: "organisasi", label: "Organisasi" },
  { id: "sosial", label: "Sosial & Kerohanian" },
];

const DEFAULT_UKM_ITEMS = [
  {
    id: "default-ukm-1",
    title: "Seni dan kreativitas",
    category: "seni",
    categoryLabel: "Seni & Kreativitas",
    description: "Ruang untuk berekspresi melalui karya, pertunjukan, dan kegiatan kreatif.",
    meta: "Tanggal / informasi selengkapnya",
    imageUrl: null,
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-ukm-2",
    title: "Olahraga dan kebugaran",
    category: "olahraga",
    categoryLabel: "Olahraga",
    description: "Bangun kerja sama tim, disiplin, dan semangat sportif melalui aktivitas olahraga.",
    meta: "Tanggal / informasi selengkapnya",
    imageUrl: null,
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-ukm-3",
    title: "Teknologi dan komunitas",
    category: "teknologi",
    categoryLabel: "Teknologi",
    description: "Berbagi pengetahuan, mengembangkan keterampilan, dan mencoba ide baru bersama.",
    meta: "Tanggal / informasi selengkapnya",
    imageUrl: null,
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-ukm-4",
    title: "Organisasi dan kepemimpinan",
    category: "organisasi",
    categoryLabel: "Organisasi",
    description: "Kembangkan jiwa kepemimpinan, manajemen organisasi, dan jejaring kolaboratif.",
    meta: "Tanggal / informasi selengkapnya",
    imageUrl: null,
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-ukm-5",
    title: "Sosial dan kerohanian",
    category: "sosial",
    categoryLabel: "Sosial & Kerohanian",
    description: "Menumbuhkan empati sosial, kebersamaan, dan pembinaan nilai-nilai spiritual di kampus.",
    meta: "Tanggal / informasi selengkapnya",
    imageUrl: null,
    sortOrder: 5,
    status: "published",
  },
];

const serializeUkmSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_UKM_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_UKM_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_UKM_SETTINGS.heroTitle,
    heroSubtitle: row.hero_subtitle ?? DEFAULT_UKM_SETTINGS.heroSubtitle,
    heroBadge: row.hero_badge ?? DEFAULT_UKM_SETTINGS.heroBadge,
    introEyebrow: row.intro_eyebrow ?? DEFAULT_UKM_SETTINGS.introEyebrow,
    introTitle: row.intro_title ?? DEFAULT_UKM_SETTINGS.introTitle,
    introDescription: row.intro_description ?? DEFAULT_UKM_SETTINGS.introDescription,
    categoryTitle: row.category_title ?? DEFAULT_UKM_SETTINGS.categoryTitle,
    categoryDesc: row.category_desc ?? DEFAULT_UKM_SETTINGS.categoryDesc,
    cardsTitle: row.cards_title ?? DEFAULT_UKM_SETTINGS.cardsTitle,
    cardsDesc: row.cards_desc ?? DEFAULT_UKM_SETTINGS.cardsDesc,
    ctaTitle: row.cta_title ?? DEFAULT_UKM_SETTINGS.ctaTitle,
    ctaDescription: row.cta_description ?? DEFAULT_UKM_SETTINGS.ctaDescription,
    ctaButtonLabel: row.cta_button_label ?? DEFAULT_UKM_SETTINGS.ctaButtonLabel,
    modalTitle: row.modal_title ?? DEFAULT_UKM_SETTINGS.modalTitle,
    modalSubtitle: row.modal_subtitle ?? DEFAULT_UKM_SETTINGS.modalSubtitle,
    modalScheduleText: row.modal_schedule_text ?? DEFAULT_UKM_SETTINGS.modalScheduleText,
    modalRequirementsText: row.modal_requirements_text ?? DEFAULT_UKM_SETTINGS.modalRequirementsText,
    modalContactEmail: row.modal_contact_email ?? DEFAULT_UKM_SETTINGS.modalContactEmail,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeUkmItem = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label ?? row.categoryLabel,
    description: row.description,
    meta: row.meta ?? null,
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const itemNotFound = (id) =>
  new AppError(`Kegiatan mahasiswa (UKM) dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  ITEMS_TABLE,
  DEFAULT_UKM_SETTINGS,
  DEFAULT_UKM_CATEGORIES,
  DEFAULT_UKM_ITEMS,
  serializeUkmSettings,
  serializeUkmItem,
  itemNotFound,
};

