import { apiGet } from "./api";

export interface RtmRtlReport {
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

export const lpmRtmRtlReportApi = {
  list: () => apiGet<{ items: RtmRtlReport[] }>("/lpm-rtm-rtl-reports"),

  getByYear: (year: number) =>
    apiGet<{ report: RtmRtlReport }>(`/lpm-rtm-rtl-reports/by-year/${year}`),
};
