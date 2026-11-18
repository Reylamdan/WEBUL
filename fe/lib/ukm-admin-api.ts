import {
  ApiError,
  buildUrl,
  type Paged,
  type UkmCategory,
  type UkmItemData,
  type UkmSettings,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminUkmItem extends UkmItemData {
  status: PublishStatus;
}

export interface UkmItemInput {
  title: string;
  category: string;
  categoryLabel?: string | null;
  description: string;
  meta?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  status: PublishStatus;
}

export interface UkmSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  introEyebrow?: string;
  introTitle?: string;
  introDescription?: string;
  categoryTitle?: string;
  categoryDesc?: string;
  cardsTitle?: string;
  cardsDesc?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonLabel?: string;
  modalTitle?: string;
  modalSubtitle?: string;
  modalScheduleText?: string;
  modalRequirementsText?: string;
  modalContactEmail?: string;
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

const base = "/admin/ukm";

export const ukmAdminApi = {
  // Settings
  getSettings: () =>
    adminRequest<{ settings: UkmSettings; categories: UkmCategory[] }>(`${base}/settings`).then(
      (r) => r.data!
    ),

  updateSettings: (input: UkmSettingsInput) =>
    adminRequest<{ settings: UkmSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // Items (Daftar UKM)
  listItems: (params?: {
    page?: number;
    limit?: number;
    status?: PublishStatus | "";
    category?: string;
    search?: string;
  }) => adminRequest<Paged<AdminUkmItem>>(`${base}/items`, {}, params).then((r) => r.data!),

  getItem: (id: string) =>
    adminRequest<{ item: AdminUkmItem }>(`${base}/items/${id}`).then((r) => r.data!.item),

  createItem: (input: UkmItemInput) =>
    adminRequest<{ item: AdminUkmItem }>(`${base}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  updateItem: (id: string, input: Partial<UkmItemInput>) =>
    adminRequest<{ item: AdminUkmItem }>(`${base}/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  deleteItem: (id: string) =>
    adminRequest<{ id: string }>(`${base}/items/${id}`, {
      method: "DELETE",
    }).then((r) => r.data!),
};

