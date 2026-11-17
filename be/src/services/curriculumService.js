const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "curriculum_settings";
const PROGRAMS_TABLE = "curriculum_programs";

const DEFAULT_CURRICULUM_SETTINGS = {
  heroEyebrow: "AKADEMIK UNIVERSITAS LIA",
  heroTitle: "Kurikulum",
  heroDescription:
    "Informasi tentang pendekatan, struktur, dan arah pembelajaran di Universitas LIA. Rincian kurikulum mengikuti program studi dan dokumen akademik resmi.",
  obeTitle: "Outcome-Based Education (OBE)",
  obeLead: "Capaian pembelajaran sebagai arah perancangan mata kuliah.",
  obeDescription:
    "Kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang dibutuhkan lulusan.",
  tableEyebrow: "STRUKTUR KURIKULUM",
  tableTitle: "Komponen pembelajaran program studi",
  tableIntro:
    "Gambaran umum fokus pembelajaran setiap program studi. Untuk rincian mata kuliah, rujuk dokumen kurikulum resmi program studi.",
  tableNote:
    "Catatan: rincian mata kuliah dapat berbeda menurut program studi dan periode kurikulum.",
};

const DEFAULT_CURRICULUM_PROGRAMS = [
  {
    id: "default-1",
    name: "D3 Bahasa Inggris",
    href: "/akademik/programstudi/humanioradesain/d3-bing",
    focus: "Bahasa, komunikasi, dan kajian linguistik",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-2",
    name: "S1 Bahasa Inggris",
    href: "/akademik/programstudi/humanioradesain/s1-bing",
    focus: "Bahasa Inggris, sastra, dan komunikasi",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-3",
    name: "S1 Bahasa Jepang",
    href: "/akademik/programstudi/humanioradesain/s1-bjepang",
    focus: "Bahasa Jepang, budaya, dan penerjemahan",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-4",
    name: "S1 Desain Komunikasi Visual",
    href: "/akademik/programstudi/humanioradesain/s1-dkv",
    focus: "Desain, komunikasi visual, dan praktik kreatif",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-5",
    name: "S1 Bisnis Digital",
    href: "/akademik/programstudi/sainsdanbisnis/s1-bisnis-digital",
    focus: "Bisnis, manajemen, dan teknologi digital",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 5,
    status: "published",
  },
  {
    id: "default-6",
    name: "S1 Sistem Informasi",
    href: "/akademik/programstudi/sainsdanbisnis/s1-sistem-informasi",
    focus: "Sistem informasi dan transformasi digital",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 6,
    status: "published",
  },
  {
    id: "default-7",
    name: "S1 Informatika",
    href: "/akademik/programstudi/sainsdanbisnis/s1-informatika",
    focus: "Komputasi, pemrograman, dan pengembangan teknologi",
    components: "Mata kuliah inti dan pilihan",
    sortOrder: 7,
    status: "published",
  },
];

const serializeCurriculumSettings = (row) => {
  if (!row) return { ...DEFAULT_CURRICULUM_SETTINGS, updatedAt: new Date().toISOString() };
  return {
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_CURRICULUM_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_CURRICULUM_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_CURRICULUM_SETTINGS.heroDescription,
    obeTitle: row.obe_title ?? DEFAULT_CURRICULUM_SETTINGS.obeTitle,
    obeLead: row.obe_lead ?? DEFAULT_CURRICULUM_SETTINGS.obeLead,
    obeDescription: row.obe_description ?? DEFAULT_CURRICULUM_SETTINGS.obeDescription,
    tableEyebrow: row.table_eyebrow ?? DEFAULT_CURRICULUM_SETTINGS.tableEyebrow,
    tableTitle: row.table_title ?? DEFAULT_CURRICULUM_SETTINGS.tableTitle,
    tableIntro: row.table_intro ?? DEFAULT_CURRICULUM_SETTINGS.tableIntro,
    tableNote: row.table_note ?? DEFAULT_CURRICULUM_SETTINGS.tableNote,
    updatedAt: row.updated_at,
  };
};

const serializeCurriculumProgram = (row, { includeStatus = true } = {}) => {
  const item = {
    id: row.id,
    name: row.name,
    href: row.href,
    focus: row.focus,
    components: row.components,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) item.status = row.status;
  return item;
};

const programNotFound = () => new AppError("Data program studi kurikulum tidak ditemukan", 404, "CURRICULUM_PROGRAM_NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  PROGRAMS_TABLE,
  DEFAULT_CURRICULUM_SETTINGS,
  DEFAULT_CURRICULUM_PROGRAMS,
  serializeCurriculumSettings,
  serializeCurriculumProgram,
  programNotFound,
};

