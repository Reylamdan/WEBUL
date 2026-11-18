const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "foreign_student_settings";
const REQUIREMENTS_TABLE = "foreign_student_requirements";

const DEFAULT_FOREIGN_STUDENT_SETTINGS = {
  heroTitle: "Mahasiswa Asing",
  introEyebrow: "PENERIMAAN MAHASISWA",
  introTitle: "Selamat datang di Universitas LIA",
  introDescription: "Mahasiswa asing adalah warga negara asing yang akan mengikuti pendidikan pada Universitas LIA.",
  requirementsEyebrow: "PERSIAPAN DOKUMEN",
  requirementsTitle: "Syarat dan Ketentuan",
  requirementsDescription:
    "Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib memenuhi dokumen persyaratan yang digunakan untuk mengurus izin belajar dibawah ini:",
  referenceTitle: "Referensi Dokumen",
  referenceDescription: "Contoh dokumen persyaratan dapat dilihat melalui link:",
  referenceUrl: "https://izinbelajar.kemdiktisaintek.go.id",
  referenceLabel: "izinbelajar.kemdiktisaintek.go.id",
};

const DEFAULT_FOREIGN_STUDENT_REQUIREMENTS = [
  {
    id: "default-req-1",
    title: "Paspor",
    description: "Paspor",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-req-2",
    title: "Surat Pernyataan",
    description:
      "Surat Pernyataan tidak akan bekerja selama belajar di Indonesia, tidak berpartisipasi di dalam aktivitas politik dan mematuhi peraturan perundang-undangan yang ada di Indonesia (bermeterai)",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-req-3",
    title: "Ijazah & Transkrip",
    description: "Ijazah yang telah disetarakan, transkrip akademik, dan rapor terakhir",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-req-4",
    title: "Surat Jaminan Pembiayaan",
    description: "Surat Keterangan Jaminan Pembiayaan",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-req-5",
    title: "Surat Keterangan Sehat",
    description: "Surat Keterangan Sehat",
    sortOrder: 5,
    status: "published",
  },
  {
    id: "default-req-6",
    title: "Foto Berwarna",
    description: "Foto berwarna ukuran paspor",
    sortOrder: 6,
    status: "published",
  },
  {
    id: "default-req-7",
    title: "Paspor Penjamin",
    description: "Paspor orang tua atau penjamin",
    sortOrder: 7,
    status: "published",
  },
  {
    id: "default-req-8",
    title: "KITAS",
    description: "Keterangan Izin Tinggal Terbatas / KITAS (khusus izin perpanjangan)",
    sortOrder: 8,
    status: "published",
  },
  {
    id: "default-req-9",
    title: "Letter of Acceptance",
    description: "Surat keterangan diterima di Universitas LIA (Letter of Acceptance)",
    sortOrder: 9,
    status: "published",
  },
];

const serializeForeignStudentSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_FOREIGN_STUDENT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroTitle: row.hero_title ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.heroTitle,
    introEyebrow: row.intro_eyebrow ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.introEyebrow,
    introTitle: row.intro_title ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.introTitle,
    introDescription: row.intro_description ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.introDescription,
    requirementsEyebrow: row.requirements_eyebrow ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.requirementsEyebrow,
    requirementsTitle: row.requirements_title ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.requirementsTitle,
    requirementsDescription:
      row.requirements_description ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.requirementsDescription,
    referenceTitle: row.reference_title ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.referenceTitle,
    referenceDescription: row.reference_description ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.referenceDescription,
    referenceUrl: row.reference_url ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.referenceUrl,
    referenceLabel: row.reference_label ?? DEFAULT_FOREIGN_STUDENT_SETTINGS.referenceLabel,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeForeignStudentRequirement = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title ?? null,
    description: row.description,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const itemNotFound = (id) =>
  new AppError(`Dokumen persyaratan mahasiswa asing dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  REQUIREMENTS_TABLE,
  DEFAULT_FOREIGN_STUDENT_SETTINGS,
  DEFAULT_FOREIGN_STUDENT_REQUIREMENTS,
  serializeForeignStudentSettings,
  serializeForeignStudentRequirement,
  itemNotFound,
};

