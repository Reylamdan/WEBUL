const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "tuition_settings";
const WAVES_TABLE = "tuition_waves";

const DEFAULT_STUDY_PROGRAMS = [
  "Bahasa Jepang",
  "Bahasa Inggris",
  "Desain Komunikasi Visual",
  "Sistem Informasi",
  "Informatika",
  "Bisnis Digital",
  "D3 Bahasa Inggris",
];

const DEFAULT_TUITION_SETTINGS = {
  heroEyebrow: "PENERIMAAN MAHASISWA BARU",
  heroTitle: "Biaya Kuliah",
  heroDescription:
    "Temukan informasi biaya kuliah Universitas LIA berdasarkan program studi dan gelombang pendaftaran. Pilih gelombang untuk melihat rincian biaya pendidikan.",
  sectionEyebrow: "RINCIAN BIAYA",
  sectionTitle: "UKT setiap Gelombang",
  studyPrograms: DEFAULT_STUDY_PROGRAMS,
};

const DEFAULT_TUITION_WAVES = [
  {
    id: "default-1",
    name: "Gelombang 1",
    period: "01 Januari – 31 Maret 2026",
    fees: [
      { program: "Bahasa Jepang", amount: 5250000 },
      { program: "Bahasa Inggris", amount: 5250000 },
      { program: "Desain Komunikasi Visual", amount: 5000000 },
      { program: "Sistem Informasi", amount: 5000000 },
      { program: "Informatika", amount: 5000000 },
      { program: "Bisnis Digital", amount: 5000000 },
      { program: "D3 Bahasa Inggris", amount: 4500000 },
    ],
    tuition: [5250000, 5250000, 5000000, 5000000, 5000000, 5000000, 4500000],
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-2",
    name: "Gelombang 2",
    period: "01 April – 30 Juni 2026",
    fees: [
      { program: "Bahasa Jepang", amount: 6000000 },
      { program: "Bahasa Inggris", amount: 6000000 },
      { program: "Desain Komunikasi Visual", amount: 5250000 },
      { program: "Sistem Informasi", amount: 5250000 },
      { program: "Informatika", amount: 5250000 },
      { program: "Bisnis Digital", amount: 5250000 },
      { program: "D3 Bahasa Inggris", amount: 4500000 },
    ],
    tuition: [6000000, 6000000, 5250000, 5250000, 5250000, 5250000, 4500000],
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-3",
    name: "Gelombang 3",
    period: "01 Juli – 30 September 2026",
    fees: [
      { program: "Bahasa Jepang", amount: 6750000 },
      { program: "Bahasa Inggris", amount: 6750000 },
      { program: "Desain Komunikasi Visual", amount: 5250000 },
      { program: "Sistem Informasi", amount: 5250000 },
      { program: "Informatika", amount: 5250000 },
      { program: "Bisnis Digital", amount: 5250000 },
      { program: "D3 Bahasa Inggris", amount: 5000000 },
    ],
    tuition: [6750000, 6750000, 5250000, 5250000, 5250000, 5250000, 5000000],
    sortOrder: 3,
    status: "published",
  },
];

const serializeTuitionSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_TUITION_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let studyPrograms = DEFAULT_STUDY_PROGRAMS;
  if (Array.isArray(row.study_programs)) {
    studyPrograms = row.study_programs.filter((p) => typeof p === "string" && p.trim() !== "");
  } else if (typeof row.study_programs === "string") {
    try {
      const parsed = JSON.parse(row.study_programs);
      if (Array.isArray(parsed)) {
        studyPrograms = parsed.filter((p) => typeof p === "string" && p.trim() !== "");
      }
    } catch {
      studyPrograms = DEFAULT_STUDY_PROGRAMS;
    }
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_TUITION_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_TUITION_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_TUITION_SETTINGS.heroDescription,
    sectionEyebrow: row.section_eyebrow ?? DEFAULT_TUITION_SETTINGS.sectionEyebrow,
    sectionTitle: row.section_title ?? DEFAULT_TUITION_SETTINGS.sectionTitle,
    studyPrograms,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeTuitionWave = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;

  let fees = [];
  if (Array.isArray(row.fees)) {
    fees = row.fees.map((f) => ({
      program: typeof f?.program === "string" ? f.program : "",
      amount: typeof f?.amount === "number" ? f.amount : Number(f?.amount) || 0,
    }));
  } else if (typeof row.fees === "string") {
    try {
      const parsed = JSON.parse(row.fees);
      if (Array.isArray(parsed)) {
        fees = parsed.map((f) => ({
          program: typeof f?.program === "string" ? f.program : "",
          amount: typeof f?.amount === "number" ? f.amount : Number(f?.amount) || 0,
        }));
      }
    } catch {
      fees = [];
    }
  }

  const tuition = fees.map((f) => f.amount);

  const out = {
    id: row.id,
    name: row.name,
    period: row.period ?? "",
    fees,
    tuition,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeStatus) {
    out.status = row.status || "draft";
  }

  return out;
};

const waveNotFound = (id) =>
  new AppError(`Gelombang biaya kuliah dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  WAVES_TABLE,
  DEFAULT_STUDY_PROGRAMS,
  DEFAULT_TUITION_SETTINGS,
  DEFAULT_TUITION_WAVES,
  serializeTuitionSettings,
  serializeTuitionWave,
  waveNotFound,
};

