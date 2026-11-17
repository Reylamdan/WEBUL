import { ApiError, buildUrl, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Berita Terkini (butuh login admin). Semua panggilan memakai token sesi admin.

export type NewsStatus = "draft" | "published";

export interface AdminNews {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  status: NewsStatus;
  publishedAt: string | null;
  author: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  // Hanya ada pada detail (GET /admin/news/:id), tidak ada pada daftar.
  contentHtml?: string;
}

// Bentuk data yang dikirim ke backend.
export interface NewsCreateInput {
  title: string;
  contentHtml: string;
  // Kosong = dibuat otomatis dari isi berita.
  excerpt: string;
  category: string | null;
  status: NewsStatus;
}

export interface NewsUpdateInput extends Partial<NewsCreateInput> {
  // Hanya dikirim jika admin mengubahnya secara sengaja.
  slug?: string;
}

export interface NewsAdminListParams {
  page?: number;
  limit?: number;
  status?: NewsStatus | "";
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
        // FormData (upload cover) harus diberi boundary otomatis oleh browser, jadi tanpa Content-Type manual.
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

export const newsAdminApi = {
  list: (params: NewsAdminListParams) =>
    adminRequest<Paged<AdminNews>>("/admin/news", {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  // Detail memuat contentHtml (daftar tidak).
  detail: (id: string) =>
    adminRequest<{ news: AdminNews }>(`/admin/news/${encodeURIComponent(id)}`).then((r) => r.data!.news),

  create: (input: NewsCreateInput) =>
    adminRequest<{ news: AdminNews }>("/admin/news", { method: "POST", body: JSON.stringify(input) }).then(
      (r) => r.data!.news,
    ),

  update: (id: string, input: NewsUpdateInput) =>
    adminRequest<{ news: AdminNews }>(`/admin/news/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.news),

  // Field multipart harus bernama "cover" (JPEG/PNG/WebP, maks. 5 MB).
  uploadCover: (id: string, file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ news: AdminNews }>(`/admin/news/${encodeURIComponent(id)}/cover`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.news);
  },

  removeCover: (id: string) =>
    adminRequest<{ news: AdminNews }>(`/admin/news/${encodeURIComponent(id)}/cover`, {
      method: "DELETE",
    }).then((r) => r.data!.news),

  remove: (id: string) => adminRequest<undefined>(`/admin/news/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
