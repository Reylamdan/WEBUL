import { ApiError, buildUrl, type Paged, type ProfileCardItem, type ProfileContent } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type CardStatus = "draft" | "published";

export interface AdminProfileCard extends ProfileCardItem {
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCardInput {
  title: string;
  description: string;
  href: string;
  sortOrder: number;
  status: CardStatus;
}

export interface ProfileContentInput {
  heroTitle?: string;
  heroSubtitle?: string;
  aboutEyebrow?: string;
  aboutTitle?: string;
  aboutLead?: string;
  aboutBody?: string;
  exploreEyebrow?: string;
  exploreTitle?: string;
  exploreDescription?: string;
  bottomNote?: string;
}

export interface ProfileCardListParams {
  page?: number;
  limit?: number;
  status?: CardStatus | "";
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

const base = "/admin/profile";

export const profileAdminApi = {
  // Konten Halaman Profil
  getContent: () => adminRequest<{ content: ProfileContent }>(`${base}/content`).then((r) => r.data!.content),

  updateContent: (input: ProfileContentInput) =>
    adminRequest<{ content: ProfileContent }>(`${base}/content`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.content),

  uploadHeroImage: (file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ content: ProfileContent }>(`${base}/content/hero-image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.content);
  },

  removeHeroImage: () =>
    adminRequest<{ content: ProfileContent }>(`${base}/content/hero-image`, { method: "DELETE" }).then(
      (r) => r.data!.content
    ),

  uploadAboutImage: (file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ content: ProfileContent }>(`${base}/content/about-image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.content);
  },

  removeAboutImage: () =>
    adminRequest<{ content: ProfileContent }>(`${base}/content/about-image`, { method: "DELETE" }).then(
      (r) => r.data!.content
    ),

  // Kartu Jelajahi Profil (CRUD)
  listCards: (params: ProfileCardListParams) =>
    adminRequest<Paged<AdminProfileCard>>(`${base}/cards`, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  getCard: (id: string) =>
    adminRequest<{ card: AdminProfileCard }>(`${base}/cards/${encodeURIComponent(id)}`).then((r) => r.data!.card),

  createCard: (input: ProfileCardInput) =>
    adminRequest<{ card: AdminProfileCard }>(`${base}/cards`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.card),

  updateCard: (id: string, input: Partial<ProfileCardInput>) =>
    adminRequest<{ card: AdminProfileCard }>(`${base}/cards/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.card),

  removeCard: (id: string) =>
    adminRequest<undefined>(`${base}/cards/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

