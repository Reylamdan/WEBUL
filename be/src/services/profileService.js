const AppError = require("../utils/AppError");
const { getCoverPublicUrl } = require("../utils/coverStorage");

const SETTINGS_TABLE = "profile_page_settings";
const CARDS_TABLE = "profile_cards";

const DEFAULT_PROFILE_CONTENT = {
  heroTitle: "Profil Universitas LIA",
  heroSubtitle:
    "Mengenal Universitas LIA, perjalanan institusi, nilai, dan lingkungan akademik yang mendukung pengembangan kompetensi.",
  heroImageUrl: null,
  aboutEyebrow: "TENTANG KAMI",
  aboutTitle: "Mengenal Universitas LIA",
  aboutLead: "Informasi ringkas mengenai identitas, perjalanan, dan komitmen Universitas LIA.",
  aboutBody:
    "Universitas LIA berkomitmen menghadirkan pengalaman pendidikan yang relevan, kolaboratif, dan berorientasi pada pengembangan kompetensi. Bagian ini dapat dilengkapi dengan profil resmi, nilai institusi, serta informasi utama universitas.",
  aboutImageUrl: null,
  exploreEyebrow: "JELAJAHI PROFIL",
  exploreTitle: "Informasi Universitas LIA",
  exploreDescription: "Pilih bagian profil untuk melihat informasi lebih lanjut.",
  bottomNote: "Konten dan foto pendukung dapat ditambahkan setelah materi resmi tersedia.",
};

const DEFAULT_PROFILE_CARDS = [
  {
    id: "default-1",
    title: "Sejarah",
    description: "Perjalanan dan perkembangan institusi.",
    href: "/profil/sejarah",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-2",
    title: "Visi & Misi",
    description: "Arah dan komitmen universitas.",
    href: "/profil/visi-misi",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-3",
    title: "Struktur Organisasi",
    description: "Susunan organisasi dan tata kelola.",
    href: "/profil/struktur-organisasi",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-4",
    title: "Akreditasi",
    description: "Informasi akreditasi institusi dan program studi.",
    href: "/profil/akreditasi",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-5",
    title: "Fasilitas Kampus",
    description: "Ruang dan fasilitas pendukung kegiatan kampus.",
    href: "/profil/fasilitas-kampus",
    sortOrder: 5,
    status: "published",
  },
  {
    id: "default-6",
    title: "Unit dan Bagian",
    description: "Unit pelaksana teknis dan bagian tata kelola universitas.",
    href: "/profil/unit-dan-bagian",
    sortOrder: 6,
    status: "published",
  },
];

const serializeProfileContent = (row) => {
  if (!row) return { ...DEFAULT_PROFILE_CONTENT, updatedAt: new Date().toISOString() };
  return {
    heroTitle: row.hero_title ?? DEFAULT_PROFILE_CONTENT.heroTitle,
    heroSubtitle: row.hero_subtitle ?? DEFAULT_PROFILE_CONTENT.heroSubtitle,
    heroImageUrl: getCoverPublicUrl(row.hero_image_path),
    aboutEyebrow: row.about_eyebrow ?? DEFAULT_PROFILE_CONTENT.aboutEyebrow,
    aboutTitle: row.about_title ?? DEFAULT_PROFILE_CONTENT.aboutTitle,
    aboutLead: row.about_lead ?? DEFAULT_PROFILE_CONTENT.aboutLead,
    aboutBody: row.about_body ?? DEFAULT_PROFILE_CONTENT.aboutBody,
    aboutImageUrl: getCoverPublicUrl(row.about_image_path),
    exploreEyebrow: row.explore_eyebrow ?? DEFAULT_PROFILE_CONTENT.exploreEyebrow,
    exploreTitle: row.explore_title ?? DEFAULT_PROFILE_CONTENT.exploreTitle,
    exploreDescription: row.explore_description ?? DEFAULT_PROFILE_CONTENT.exploreDescription,
    bottomNote: row.bottom_note ?? DEFAULT_PROFILE_CONTENT.bottomNote,
    updatedAt: row.updated_at,
  };
};

const serializeProfileCard = (row, { includeStatus = true } = {}) => {
  const card = {
    id: row.id,
    title: row.title,
    description: row.description,
    href: row.href,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) card.status = row.status;
  return card;
};

const cardNotFound = () => new AppError("Data kartu profil tidak ditemukan", 404, "PROFILE_CARD_NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  CARDS_TABLE,
  DEFAULT_PROFILE_CONTENT,
  DEFAULT_PROFILE_CARDS,
  serializeProfileContent,
  serializeProfileCard,
  cardNotFound,
};

