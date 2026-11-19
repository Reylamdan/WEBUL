import { apiGet, type Paged } from "./api";

export interface BenchmarkingItem {
  id: string;
  title: string;
  institution: string;
  /** Label kecil di kartu, contoh: "DOKUMENTASI". */
  label: string;
  date: string;
  year: number | null;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  file: {
    mimeType: string;
    size: number | null;
    url: string;
    downloadUrl: string;
  } | null;
}

export interface BenchmarkingListParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: number;
}

export const lpmBenchmarkingApi = {
  list: (params: BenchmarkingListParams = {}) =>
    apiGet<Paged<BenchmarkingItem>>("/lpm-benchmarkings", {
      page: params.page,
      limit: params.limit,
      search: params.search,
      year: params.year,
    }),

  filterOptions: () =>
    apiGet<{ years: number[] }>("/lpm-benchmarkings/filter-options"),
};
