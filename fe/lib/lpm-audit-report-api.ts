import { apiGet } from "./api";

export interface AuditReport {
  id: string;
  year: number;
  title: string;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  /** null = dokumen belum tersedia ("Arsip belum tersedia"). */
  file: {
    mimeType: string;
    size: number | null;
    url: string;
    downloadUrl: string;
  } | null;
}

export const lpmAuditReportApi = {
  list: () => apiGet<{ items: AuditReport[] }>("/lpm-audit-reports"),

  getByYear: (year: number) =>
    apiGet<{ report: AuditReport }>(`/lpm-audit-reports/by-year/${year}`),
};
