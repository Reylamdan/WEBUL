import {
  ApiError,
  buildUrl,
  type Paged,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface BenchmarkingFileRef {
  mimeType: string;
  size: number | null;
  url: string;
  downloadUrl: string;
  urlExpiresAt?: string;
}

export interface AdminBenchmarkingItem {
  id: string;
  title: string;
  institution: string;
  label: string;
  date: string;
  year: number | null;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  file: BenchmarkingFileRef | null;
  status: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBenchmarkingListParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: number;
  status?: PublishStatus | "";
  [key: string]: string | number | undefined;
}

export interface BenchmarkingCreateInput {
  title: string;
  institution?: string;
  label?: string;
  date: string;
  description?: string;
  status?: "draft";
}

export interface BenchmarkingUpdateInput {
  title?: string;
  institution?: string;
  label?: string;
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

const base = "/admin/lpm-benchmarkings";
type One = { benchmarking: AdminBenchmarkingItem };

export const lpmBenchmarkingAdminApi = {
  list: (params?: AdminBenchmarkingListParams) =>
    adminRequest<Paged<AdminBenchmarkingItem>>(base, {}, params).then((r) => r.data!),

  filterOptions: () =>
    adminRequest<{ years: number[] }>(`${base}/filter-options`).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`).then((r) => r.data!.benchmarking),

  create: (input: BenchmarkingCreateInput) =>
    adminRequest<One>(base, { method: "POST", body: JSON.stringify(input) }).then(
      (r) => r.data!.benchmarking
    ),

  update: (id: string, input: BenchmarkingUpdateInput) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.benchmarking),

  /** Unggah/ganti dokumen (PDF/DOCX/XLSX, maks 20 MB) -> disimpan di Google Drive. */
  uploadDocument: (id: string, file: File) => {
    const body = new FormData();
    body.append("document", file);
    return adminRequest<One>(`${base}/${encodeURIComponent(id)}/document`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.benchmarking);
  },

  removeDocument: (id: string) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}/document`, {
      method: "DELETE",
    }).then((r) => r.data!.benchmarking),

  remove: (id: string) =>
    adminRequest<{ message: string }>(`${base}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
