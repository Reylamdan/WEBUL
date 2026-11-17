import { ApiError, buildUrl, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Pengumuman (butuh login admin). Semua panggilan memakai token sesi admin.

export type AnnouncementStatus = "draft" | "published";

export interface AdminAnnouncement {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  status: AnnouncementStatus;
  publishedAt: string | null;
  author: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  // Hanya ada pada detail (GET /admin/announcements/:id), tidak ada pada daftar.
  contentHtml?: string;
}

// Bentuk data yang dikirim ke backend.
export interface AnnouncementCreateInput {
  title: string;
  contentHtml: string;
  // Kosong = dibuat otomatis dari isi pengumuman.
  excerpt: string;
  category: string | null;
  status: AnnouncementStatus;
}

export interface AnnouncementUpdateInput extends Partial<AnnouncementCreateInput> {
  // Hanya dikirim jika admin mengubahnya secara sengaja.
  slug?: string;
}

export interface AnnouncementAdminListParams {
  page?: number;
  limit?: number;
  status?: AnnouncementStatus | "";
  category?: string;
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
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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
    // Pesan validasi per field digabung agar admin tahu bagian mana yang salah.
    const details = body?.errors?.map((item) => item.message).join(" ");
    throw new ApiError(
      [body?.message, details].filter(Boolean).join(": ") || "Terjadi kesalahan pada server.",
      response.status,
      body?.code,
    );
  }
  return body;
}

export const announcementAdminApi = {
  list: (params: AnnouncementAdminListParams) =>
    adminRequest<Paged<AdminAnnouncement>>("/admin/announcements", {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  // Detail memuat contentHtml (daftar tidak).
  detail: (id: string) =>
    adminRequest<{ announcement: AdminAnnouncement }>(`/admin/announcements/${encodeURIComponent(id)}`).then(
      (r) => r.data!.announcement,
    ),

  create: (input: AnnouncementCreateInput) =>
    adminRequest<{ announcement: AdminAnnouncement }>("/admin/announcements", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.announcement),

  update: (id: string, input: AnnouncementUpdateInput) =>
    adminRequest<{ announcement: AdminAnnouncement }>(`/admin/announcements/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.announcement),

  remove: (id: string) =>
    adminRequest<undefined>(`/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
