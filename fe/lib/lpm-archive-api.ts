
import { apiGet, type Paged } from "./api";

export type ArchiveCategory =
  | "Audit Mutu Internal"
  | "RTM & RTL"
  | "Laporan Tahunan"
  | "Penjaminan Mutu"
  | "Dokumen Pendukung";

export interface ArchiveDocument {
  id: string;
  title: string;
  category: ArchiveCategory;
  year: number;
  date: string;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  file: {
    mimeType: string;
    size: number;
    url: string;
    downloadUrl: string;
  } | null;
}

export interface ArchiveFilterOptions {
  categories: ArchiveCategory[];
  years: number[];
}

export interface ArchiveListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  year?: number;
}

export const lpmArchiveApi = {
  list: (params: ArchiveListParams = {}) =>
    apiGet<Paged<ArchiveDocument>>("/lpm-archives", {
      page: params.page,
      limit: params.limit,
      search: params.search,
      category: params.category,
      year: params.year,
    }),

  filterOptions: () =>
    apiGet<ArchiveFilterOptions>("/lpm-archives/filter-options"),
};
