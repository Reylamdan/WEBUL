import {
  ApiError,
  buildUrl,
  type Paged,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type ArchiveCategory =
  | "Audit Mutu Internal"
  | "RTM & RTL"
  | "Laporan Tahunan"
  | "Penjaminan Mutu"
  | "Dokumen Pendukung";

export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [
  "Audit Mutu Internal",
  "RTM & RTL",
  "Laporan Tahunan",
  "Penjaminan Mutu",
  "Dokumen Pendukung",
];

export type PublishStatus = "draft" | "published";

export interface ArchiveFileRef {
  mimeType: string;
  size: number | null;
  url: string;
  downloadUrl: string;
  urlExpiresAt?: string;
}

export interface AdminArchiveItem {
  id: string;
  title: string;
  category: ArchiveCategory;
  year: number;
  date: string;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  file: ArchiveFileRef | null;
  status: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveFilterOptions {
  categories: ArchiveCategory[];
  years: number[];
}

export interface AdminArchiveListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  year?: number;
  status?: PublishStatus | "";
  [key: string]: string | number | undefined;
}

export interface ArchiveCreateInput {
  title: string;
  category: ArchiveCategory;
  year: number;
  date: string;
  description?: string;
  status?: "draft";
}

export interface ArchiveUpdateInput {
  title?: string;
  category?: ArchiveCategory;
  year?: number;
  date?: string;
  description?: string;
  status?: PublishStatus;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: Array<{ field?: string; message: string }>;
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | number | undefined>
) {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      cache: "no-store",
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...getAdminAuthorizationHeaders(),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.", 0, "NETWORK_ERROR");
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    const details = body?.errors?.map((item) => item.message).join(" ");
    throw new ApiError(
      [body?.message, details].filter(Boolean).join(": ") || "Terjadi kesalahan pada server.",
      response.status,
      body?.code
    );
  }
  return body;
}

const base = "/admin/lpm-archives";

export const lpmArchiveAdminApi = {
  list: (params?: AdminArchiveListParams) =>
    adminRequest<Paged<AdminArchiveItem>>(base, {}, params).then((r) => r.data!),

  filterOptions: () =>
    adminRequest<ArchiveFilterOptions>(`${base}/filter-options`).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<{ archive: AdminArchiveItem }>(`${base}/${encodeURIComponent(id)}`).then(
      (r) => r.data!.archive
    ),

  create: (input: ArchiveCreateInput) =>
    adminRequest<{ archive: AdminArchiveItem }>(base, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.archive),

  update: (id: string, input: ArchiveUpdateInput) =>
    adminRequest<{ archive: AdminArchiveItem }>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.archive),

  uploadDocument: (id: string, file: File) => {
    const body = new FormData();
    body.append("document", file);
    return adminRequest<{ archive: AdminArchiveItem }>(
      `${base}/${encodeURIComponent(id)}/document`,
      {
        method: "PUT",
        body,
      }
    ).then((r) => r.data!.archive);
  },

  remove: (id: string) =>
    adminRequest<{ message: string }>(`${base}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
