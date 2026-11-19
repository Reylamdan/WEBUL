import { ApiError, buildUrl } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";
import type { HomepageContent, HomepagePlacement } from "./homepage-api";

export type PublishStatus = "draft" | "published";
export type ContentKey = keyof HomepageContent;

export interface AdminHomepagePhoto {
  id: string;
  placement: HomepagePlacement;
  title: string;
  caption: string;
  imageUrl: string | null;
  sortOrder: number;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHomepageVideo {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  video: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    format: string | null;
    bytes: number | null;
    duration: number | null;
  } | null;
}

export interface PhotoInput {
  placement: HomepagePlacement;
  title: string;
  caption: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface VideoInput {
  title: string;
  description: string;
  sortOrder: number;
  status: PublishStatus;
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

const base = "/admin/homepage";
const enc = encodeURIComponent;

export const homepageAdminApi = {
  // ----- Teks & tautan -----
  getContent: () =>
    adminRequest<{ content: HomepageContent; updatedAt: string | null }>(`${base}/content`).then((r) => r.data!),

  saveContent: (sections: Partial<HomepageContent>) =>
    adminRequest<{ content: HomepageContent; updatedAt: string | null }>(`${base}/content`, {
      method: "PUT",
      body: JSON.stringify(sections),
    }).then((r) => r.data!),

  resetContent: (key: ContentKey) =>
    adminRequest<{ content: HomepageContent; updatedAt: string | null }>(`${base}/content/${enc(key)}`, {
      method: "DELETE",
    }).then((r) => r.data!),

  // ----- Foto -----
  listPhotos: () =>
    adminRequest<{ items: AdminHomepagePhoto[] }>(`${base}/photos`).then((r) => r.data!.items),

  createPhoto: (input: PhotoInput) =>
    adminRequest<{ photo: AdminHomepagePhoto }>(`${base}/photos`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.photo),

  updatePhoto: (id: string, input: Partial<PhotoInput>) =>
    adminRequest<{ photo: AdminHomepagePhoto }>(`${base}/photos/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.photo),

  deletePhoto: (id: string) =>
    adminRequest<{ message: string }>(`${base}/photos/${enc(id)}`, { method: "DELETE" }),

  /** Unggah/ganti file foto (JPEG/PNG/WebP, maks 5 MB). */
  uploadPhotoImage: (id: string, file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ photo: AdminHomepagePhoto }>(`${base}/photos/${enc(id)}/image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.photo);
  },

  removePhotoImage: (id: string) =>
    adminRequest<{ photo: AdminHomepagePhoto }>(`${base}/photos/${enc(id)}/image`, {
      method: "DELETE",
    }).then((r) => r.data!.photo),

  // ----- Video -----
  listVideos: () =>
    adminRequest<{ items: AdminHomepageVideo[] }>(`${base}/videos`).then((r) => r.data!.items),

  createVideo: (input: VideoInput) =>
    adminRequest<{ video: AdminHomepageVideo }>(`${base}/videos`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.video),

  updateVideo: (id: string, input: Partial<VideoInput>) =>
    adminRequest<{ video: AdminHomepageVideo }>(`${base}/videos/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.video),

  deleteVideo: (id: string) =>
    adminRequest<{ message: string }>(`${base}/videos/${enc(id)}`, { method: "DELETE" }),

  /** Unggah file video ke Cloudinary (MP4/WebM). POST jika belum ada file, PUT untuk mengganti. */
  uploadVideoFile: (id: string, file: File, replace: boolean) => {
    const body = new FormData();
    body.append("video", file);
    return adminRequest<unknown>(`/admin/videos/homepage-videos/${enc(id)}`, {
      method: replace ? "PUT" : "POST",
      body,
    });
  },

  removeVideoFile: (id: string) =>
    adminRequest<unknown>(`/admin/videos/homepage-videos/${enc(id)}`, { method: "DELETE" }),
};
