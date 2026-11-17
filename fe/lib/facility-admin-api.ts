import { ApiError, buildUrl, type CampusFacilityItem, type FacilitySettings, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type FacilityStatus = "draft" | "published";

export interface AdminCampusFacility extends CampusFacilityItem {
  status: FacilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityInput {
  title: string;
  description: string;
  sortOrder: number;
  status: FacilityStatus;
}

export interface FacilitySettingsInput {
  heroTitle?: string;
  heroSubtitle?: string;
  galleryEyebrow?: string;
  galleryTitle?: string;
  galleryDescription?: string;
}

export interface FacilityListParams {
  page?: number;
  limit?: number;
  status?: FacilityStatus | "";
  search?: string;
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

const base = "/admin/facilities";

export const facilityAdminApi = {
  // Pengaturan Header Fasilitas
  getSettings: () =>
    adminRequest<{ settings: FacilitySettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: FacilitySettingsInput) =>
    adminRequest<{ settings: FacilitySettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  uploadHeroImage: (file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ settings: FacilitySettings }>(`${base}/settings/hero-image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.settings);
  },

  removeHeroImage: () =>
    adminRequest<{ settings: FacilitySettings }>(`${base}/settings/hero-image`, { method: "DELETE" }).then(
      (r) => r.data!.settings
    ),

  // CRUD Fasilitas Kampus
  list: (params: FacilityListParams) =>
    adminRequest<Paged<AdminCampusFacility>>(base, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<{ facility: AdminCampusFacility }>(`${base}/${encodeURIComponent(id)}`).then(
      (r) => r.data!.facility
    ),

  create: (input: FacilityInput) =>
    adminRequest<{ facility: AdminCampusFacility }>(base, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.facility),

  update: (id: string, input: Partial<FacilityInput>) =>
    adminRequest<{ facility: AdminCampusFacility }>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.facility),

  remove: (id: string) =>
    adminRequest<undefined>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }),

  uploadImage: (id: string, file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ facility: AdminCampusFacility }>(`${base}/${encodeURIComponent(id)}/image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.facility);
  },

  removeImage: (id: string) =>
    adminRequest<{ facility: AdminCampusFacility }>(`${base}/${encodeURIComponent(id)}/image`, {
      method: "DELETE",
    }).then((r) => r.data!.facility),
};

