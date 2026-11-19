import {
  ApiError,
  buildUrl,
  type Paged,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AuditReportFileRef {
  mimeType: string;
  size: number | null;
  url: string;
  downloadUrl: string;
  urlExpiresAt?: string;
}

export interface AdminAuditReportItem {
  id: string;
  year: number;
  title: string;
  description: string;
  fileName: string | null;
  fileType: "PDF" | "DOCX" | "XLSX" | null;
  fileSize: number | null;
  file: AuditReportFileRef | null;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PublishStatus | "";
  [key: string]: string | number | undefined;
}

export interface AuditReportInput {
  year: number;
  title: string;
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

const base = "/admin/lpm-audit-reports";
type One = { report: AdminAuditReportItem };

export const lpmAuditReportAdminApi = {
  list: (params?: AdminAuditReportListParams) =>
    adminRequest<Paged<AdminAuditReportItem>>(base, {}, params).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`).then((r) => r.data!.report),

  create: (input: AuditReportInput) =>
    adminRequest<One>(base, { method: "POST", body: JSON.stringify(input) }).then(
      (r) => r.data!.report
    ),

  update: (id: string, input: Partial<AuditReportInput>) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.report),

  /** Unggah/ganti dokumen (PDF/DOCX/XLSX, maks 20 MB) -> disimpan di Google Drive. */
  uploadDocument: (id: string, file: File) => {
    const body = new FormData();
    body.append("document", file);
    return adminRequest<One>(`${base}/${encodeURIComponent(id)}/document`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.report);
  },

  removeDocument: (id: string) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}/document`, {
      method: "DELETE",
    }).then((r) => r.data!.report),

  remove: (id: string) =>
    adminRequest<{ message: string }>(`${base}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
