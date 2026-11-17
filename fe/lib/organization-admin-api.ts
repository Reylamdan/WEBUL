import { ApiError, buildUrl, type OrganizationCategorySlug, type OrganizationUnit, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Struktur Organisasi (butuh login admin).

export type OrganizationStatus = "draft" | "published";

export interface AdminOrganizationUnit extends OrganizationUnit {
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationCategoryOption {
  slug: OrganizationCategorySlug;
  name: string;
  description?: string;
}

// Bentuk data yang dikirim ke backend (create & update). Gambar dikirim terpisah.
export interface OrganizationUnitInput {
  title: string;
  position: string | null;
  description: string | null;
  category: OrganizationCategorySlug;
  sortOrder: number;
  status: OrganizationStatus;
}

export interface OrganizationAdminListParams {
  page?: number;
  limit?: number;
  status?: OrganizationStatus | "";
  category?: OrganizationCategorySlug | "";
  search?: string;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: Array<{ field?: string; message: string }>;
}

async function adminRequest<T>(path: string, init: RequestInit = {}, params?: Record<string, string | number | undefined>) {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      cache: "no-store",
      ...init,
      headers: {
        // FormData (upload gambar) tidak boleh diberi Content-Type manual.
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
      body?.code,
    );
  }
  return body;
}

const base = "/admin/organization-units";

export const organizationAdminApi = {
  categories: () => adminRequest<{ categories: OrganizationCategoryOption[] }>(`${base}/categories`).then((r) => r.data!.categories),

  list: (params: OrganizationAdminListParams) =>
    adminRequest<Paged<AdminOrganizationUnit>>(base, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  create: (input: OrganizationUnitInput) =>
    adminRequest<{ unit: AdminOrganizationUnit }>(base, { method: "POST", body: JSON.stringify(input) }).then((r) => r.data!.unit),

  update: (id: string, input: Partial<OrganizationUnitInput>) =>
    adminRequest<{ unit: AdminOrganizationUnit }>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.unit),

  remove: (id: string) => adminRequest<undefined>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Gambar opsional. Field multipart bernama "cover" (sama seperti cover berita).
  uploadImage: (id: string, file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ unit: AdminOrganizationUnit }>(`${base}/${encodeURIComponent(id)}/image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.unit);
  },

  removeImage: (id: string) =>
    adminRequest<{ unit: AdminOrganizationUnit }>(`${base}/${encodeURIComponent(id)}/image`, { method: "DELETE" }).then(
      (r) => r.data!.unit,
    ),
};
