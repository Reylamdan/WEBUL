const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "rector_report_settings";
const REPORTS_TABLE = "rector_reports";

const DEFAULT_RECTOR_REPORT_SETTINGS = {
  heroTitle: "Laporan Tahunan Rektor Universitas LIA",
  heroDescription:
    "Akses dokumen laporan tahunan rektor yang dipublikasikan oleh Universitas LIA.",
  archiveTitle: "Arsip laporan",
  contactEmail: "humas@universitaslia.ac.id",
};

const DEFAULT_RECTOR_REPORTS = [
  {
    id: "default-rector-report-2024",
    year: 2024,
    title: "Laporan Tahunan Rektor 2024",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2024 yang dipublikasikan melalui situs resmi universitas.",
    coverUrl: "/Laporantahunanrektor2024.jpg",
    fileUrl: null,
    contactEmail: null,
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-rector-report-2025",
    year: 2025,
    title: "Laporan Tahunan Rektor 2025",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2025 yang dipublikasikan melalui situs resmi universitas.",
    coverUrl: "/Laporantahunanrektor2025.jpg",
    fileUrl: null,
    contactEmail: null,
    sortOrder: 2,
    status: "published",
  },
];

const serializeRectorReportSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_RECTOR_REPORT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroTitle: row.hero_title ?? DEFAULT_RECTOR_REPORT_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_RECTOR_REPORT_SETTINGS.heroDescription,
    archiveTitle: row.archive_title ?? DEFAULT_RECTOR_REPORT_SETTINGS.archiveTitle,
    contactEmail: row.contact_email ?? DEFAULT_RECTOR_REPORT_SETTINGS.contactEmail,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeRectorReport = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    year: typeof row.year === "number" ? row.year : Number(row.year) || 0,
    title: row.title,
    description: row.description || "",
    coverUrl: row.cover_url ?? row.coverUrl ?? null,
    fileUrl: row.file_url ?? row.fileUrl ?? null,
    contactEmail: row.contact_email ?? row.contactEmail ?? null,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const reportNotFound = (id) =>
  new AppError(`Laporan tahunan rektor dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  REPORTS_TABLE,
  DEFAULT_RECTOR_REPORT_SETTINGS,
  DEFAULT_RECTOR_REPORTS,
  serializeRectorReportSettings,
  serializeRectorReport,
  reportNotFound,
};

