const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "resignation_settings";
const TERMS_TABLE = "resignation_terms";

const DEFAULT_RESIGNATION_SETTINGS = {
  heroEyebrow: "INFORMASI PENTING",
  heroTitle: "Pengunduran Diri",
  heroDescription: null,
  sectionTitle: "Syarat dan Ketentuan",
};

const DEFAULT_RESIGNATION_TERMS = [
  {
    id: "default-term-1",
    title: "Diterima di PTN",
    description:
      "Mahasiswa yang mengundurkan diri karena diterima PTN wajib menyertakan surat keterangan dari kampus yang bersangkutan, dan biaya yang sudah dibayarkan akan dikembalikan 80%.",
    refundPercentage: 80,
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-term-2",
    title: "Sakit Keras / Perawatan Medis",
    description:
      "Mahasiswa yang mengundurkan diri karena sakit keras dan perlu dirawat wajib menyertakan surat keterangan dari dokter, dan biaya yang sudah dibayarkan akan dikembalikan 80% jika waktu pengunduran diri sebelum kegiatan perkuliahan dimulai.",
    refundPercentage: 80,
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-term-3",
    title: "Alasan Lainnya",
    description:
      "Mahasiswa yang mengundurkan diri di luar poin 1 dan 2, maka biaya yang sudah dibayarkan tidak dapat dikembalikan.",
    refundPercentage: 0,
    sortOrder: 3,
    status: "published",
  },
];

const serializeResignationSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_RESIGNATION_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_RESIGNATION_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_RESIGNATION_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_RESIGNATION_SETTINGS.heroDescription,
    sectionTitle: row.section_title ?? DEFAULT_RESIGNATION_SETTINGS.sectionTitle,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeResignationTerm = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title ?? null,
    description: row.description,
    refundPercentage:
      typeof row.refund_percentage === "number"
        ? row.refund_percentage
        : typeof row.refundPercentage === "number"
        ? row.refundPercentage
        : null,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const itemNotFound = (id) =>
  new AppError(`Syarat & ketentuan pengunduran diri dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  TERMS_TABLE,
  DEFAULT_RESIGNATION_SETTINGS,
  DEFAULT_RESIGNATION_TERMS,
  serializeResignationSettings,
  serializeResignationTerm,
  itemNotFound,
};

