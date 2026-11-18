import {
  ApiError,
  buildUrl,
  type Paged,
  type ResignationSettings,
  type ResignationTermItem,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminResignationTerm extends ResignationTermItem {
  status: PublishStatus;
}

export interface ResignationTermInput {
  title?: string | null;
  description: string;
  refundPercentage?: number | null;
  sortOrder: number;
  status: PublishStatus;
}

export interface ResignationSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string | null;
  sectionTitle?: string;
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

const base = "/admin/resignation";

export const resignationAdminApi = {
  // Settings
  getSettings: () =>
    adminRequest<{ settings: ResignationSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: ResignationSettingsInput) =>
    adminRequest<{ settings: ResignationSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // Terms (Syarat & Ketentuan)
  listTerms: (params?: { page?: number; limit?: number; status?: PublishStatus | ""; search?: string }) =>
    adminRequest<Paged<AdminResignationTerm>>(`${base}/terms`, {}, params).then((r) => r.data!),

  getTerm: (id: string) =>
    adminRequest<{ term: AdminResignationTerm }>(`${base}/terms/${id}`).then((r) => r.data!.term),

  createTerm: (input: ResignationTermInput) =>
    adminRequest<{ term: AdminResignationTerm }>(`${base}/terms`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.term),

  updateTerm: (id: string, input: Partial<ResignationTermInput>) =>
    adminRequest<{ term: AdminResignationTerm }>(`${base}/terms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.term),

  removeTerm: (id: string) =>
    adminRequest<void>(`${base}/terms/${id}`, { method: "DELETE" }).then(() => undefined),
};

