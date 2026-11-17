const AppError = require("../utils/AppError");
const { getCoverPublicUrl } = require("../utils/coverStorage");

const SETTINGS_TABLE = "campus_facility_settings";
const FACILITIES_TABLE = "campus_facilities";

const DEFAULT_FACILITY_SETTINGS = {
  heroTitle: "Fasilitas Kampus",
  heroSubtitle:
    "Kenali fasilitas kampus yang mendukung kegiatan belajar, kolaborasi, dan kehidupan mahasiswa.",
  heroImageUrl: null,
  galleryEyebrow: "FASILITAS PENDUKUNG",
  galleryTitle: "Ruang untuk Belajar dan Berkembang",
  galleryDescription:
    "Galeri fasilitas kampus akan dilengkapi foto dan deskripsi resmi setelah aset tersedia.",
};

const DEFAULT_FACILITIES = [
  {
    id: "default-1",
    title: "Perpustakaan",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-2",
    title: "Ruang Kelas",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-3",
    title: "Laboratorium",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-4",
    title: "Area Kampus",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-5",
    title: "Ruang Kegiatan",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 5,
    status: "published",
  },
  {
    id: "default-6",
    title: "Fasilitas Pendukung",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
    sortOrder: 6,
    status: "published",
  },
];

const serializeFacilitySettings = (row) => {
  if (!row) return { ...DEFAULT_FACILITY_SETTINGS, updatedAt: new Date().toISOString() };
  return {
    heroTitle: row.hero_title ?? DEFAULT_FACILITY_SETTINGS.heroTitle,
    heroSubtitle: row.hero_subtitle ?? DEFAULT_FACILITY_SETTINGS.heroSubtitle,
    heroImageUrl: getCoverPublicUrl(row.hero_image_path),
    galleryEyebrow: row.gallery_eyebrow ?? DEFAULT_FACILITY_SETTINGS.galleryEyebrow,
    galleryTitle: row.gallery_title ?? DEFAULT_FACILITY_SETTINGS.galleryTitle,
    galleryDescription: row.gallery_description ?? DEFAULT_FACILITY_SETTINGS.galleryDescription,
    updatedAt: row.updated_at,
  };
};

const serializeFacility = (row, { includeStatus = true } = {}) => {
  const item = {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: getCoverPublicUrl(row.image_path),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) item.status = row.status;
  return item;
};

const facilityNotFound = () => new AppError("Data fasilitas kampus tidak ditemukan", 404, "FACILITY_NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  FACILITIES_TABLE,
  DEFAULT_FACILITY_SETTINGS,
  DEFAULT_FACILITIES,
  serializeFacilitySettings,
  serializeFacility,
  facilityNotFound,
};

