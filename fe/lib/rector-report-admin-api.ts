import {
  apiGet,
  ApiError,
  buildUrl,
  type Paged,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface RectorReportItem {
  id: string;
  year: number;
  title: string;
  description: string;
  coverUrl: string | null;
  fileUrl: string | null;
  contactEmail: string | null;
  sortOrder: number;
}

export interface AdminRectorReportItem extends RectorReportItem {
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RectorReportSettings {
  id: string;
  heroTitle: string;
  heroDescription: string;
  archiveTitle: string;
  contactEmail: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RectorReportSettingsInput {
  heroTitle?: string;
  heroDescription?: string;
  archiveTitle?: string;
  contactEmail?: string;
}

export interface RectorReportInput {
  year: number;
  title: string;
  description?: string;
  coverUrl?: string | null;
  fileUrl?: string | null;
  contactEmail?: string | null;
  sortOrder?: number;
  status?: PublishStatus;
}

export interface RectorReportUpdateInput {
  year?: number;
  title?: string;
  description?: string;
  coverUrl?: string | null;
  fileUrl?: string | null;
  contactEmail?: string | null;
  sortOrder?: number;
  status?: PublishStatus;
}

export interface RectorReportListParams {
  page?: number;
  limit?: number;
  year?: number;
  status?: PublishStatus | "";
  search?: string;
  [key: string]: string | number | undefined;
}

export interface RectorReportPublicData {
  settings: RectorReportSettings;
  reports: RectorReportItem[];
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

const base = "/admin/rector-reports";

export const rectorReportAdminApi = {
  // Pengaturan halaman & kontak
  getSettings: () =>
    adminRequest<{ settings: RectorReportSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: RectorReportSettingsInput) =>
    adminRequest<{ settings: RectorReportSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // CRUD Laporan Tahunan
  list: (params?: RectorReportListParams) =>
    adminRequest<Paged<AdminRectorReportItem>>(base, {}, params).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<{ report: AdminRectorReportItem }>(`${base}/${encodeURIComponent(id)}`).then(
      (r) => r.data!.report
    ),

  create: (input: RectorReportInput) =>
    adminRequest<{ report: AdminRectorReportItem }>(base, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.report),

  update: (id: string, input: RectorReportUpdateInput) =>
    adminRequest<{ report: AdminRectorReportItem }>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.report),

  remove: (id: string) =>
    adminRequest<{ message: string }>(`${base}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

export const rectorReportPublicApi = {
  getPublicData: () => apiGet<RectorReportPublicData>("/rector-reports"),
};

