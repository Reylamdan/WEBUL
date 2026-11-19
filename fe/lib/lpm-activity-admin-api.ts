import {
  ApiError,
  buildUrl,
  type Paged,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminActivityItem {
  id: string;
  title: string;
  description: string;
  /** Format YYYY-MM-DD, null jika tanpa tanggal. */
  activityDate: string | null;
  /** Path internal ("/lpm/...") atau URL https; null jika kartu tanpa tautan. */
  linkUrl: string | null;
  sortOrder: number;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PublishStatus | "";
  [key: string]: string | number | undefined;
}

export interface ActivityInput {
  title: string;
  description?: string;
  activityDate?: string | null;
  linkUrl?: string | null;
  sortOrder?: number;
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

const base = "/admin/lpm-activities";
type One = { activity: AdminActivityItem };

export const lpmActivityAdminApi = {
  list: (params?: AdminActivityListParams) =>
    adminRequest<Paged<AdminActivityItem>>(base, {}, params).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`).then((r) => r.data!.activity),

  create: (input: ActivityInput) =>
    adminRequest<One>(base, { method: "POST", body: JSON.stringify(input) }).then(
      (r) => r.data!.activity
    ),

  update: (id: string, input: Partial<ActivityInput>) =>
    adminRequest<One>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.activity),

  remove: (id: string) =>
    adminRequest<{ message: string }>(`${base}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
