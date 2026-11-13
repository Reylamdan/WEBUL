// Klien API Universitas LIA. Alamat backend dibaca dari NEXT_PUBLIC_API_URL (lihat .env.example).

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Params = Record<string, string | number | undefined | null>;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

// Permintaan GET identik yang berjalan bersamaan (mis. dua komponen memakai daftar yang sama)
// digabung menjadi satu request. Hasilnya tidak disimpan lama agar data tetap segar.
const inflight = new Map<string, Promise<unknown>>();
const DEDUPE_MS = 3000;

export function buildUrl(path: string, params?: Params): string {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return `${API_BASE_URL}/api${path}${qs ? `?${qs}` : ""}`;
}

// Link dokumen/file dari backend bisa berupa path relatif ("/api/files/...").
export function resolveApiUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.", 0, "NETWORK_ERROR");
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    throw new ApiError(
      body?.message ?? "Terjadi kesalahan pada server. Silakan coba lagi.",
      response.status,
      body?.code,
    );
  }
  return body.data as T;
}

export function apiGet<T>(path: string, params?: Params): Promise<T> {
  const url = buildUrl(path, params);
  const existing = inflight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = request<T>(url);
  inflight.set(url, promise);
  const release = () => setTimeout(() => inflight.delete(url), DEDUPE_MS);
  promise.then(release, release);
  return promise;
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- Format ----------

const TIME_ZONE = "Asia/Jakarta";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date);
}

export function dateParts(value: string | null | undefined): { day: string; month: string } {
  if (!value) return { day: "--", month: "" };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "" };
  const day = new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: TIME_ZONE }).format(date);
  const month = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: TIME_ZONE }).format(date);
  return { day, month: month.replace(".", "").toUpperCase() };
}

// Tanggal hari ini (YYYY-MM-DD) pada zona waktu Jakarta.
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.";
}

// ---------- Tipe & endpoint ----------

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  pagination: Pagination;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  author: { name: string } | null;
  contentHtml?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | null;
  author: { id: string; name: string } | null;
  contentHtml?: string;
}

export interface CalendarCategory {
  slug: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  category: CalendarCategory;
}

export type ExpiryStatus = "active" | "expiring" | "expired" | "unknown";

export interface StudyProgramAccreditation {
  id: string;
  programName: string;
  educationLevel: string;
  faculty: string | null;
  rank: string;
  skNumber: string;
  decisionDate: string | null;
  validFrom: string | null;
  validUntil: string | null;
  issuingBody: string | null;
  expiryStatus: ExpiryStatus;
  daysUntilExpiry: number | null;
  document: { name: string; url: string | null; downloadUrl?: string | null } | null;
}

export const newsApi = {
  list: (params: { page?: number; limit?: number; search?: string }) => apiGet<Paged<NewsItem>>("/news", params),
};

export const announcementApi = {
  list: (params: { page?: number; limit?: number; search?: string }) =>
    apiGet<Paged<AnnouncementItem>>("/announcements", params),
  detail: (slug: string) =>
    apiGet<{ announcement: AnnouncementItem }>(`/announcements/${encodeURIComponent(slug)}`).then((d) => d.announcement),
};

export const calendarApi = {
  categories: () => apiGet<{ categories: CalendarCategory[] }>("/academic-calendar/categories").then((d) => d.categories),
  list: (params: { page?: number; limit?: number; category?: string; from?: string; to?: string }) =>
    apiGet<Paged<CalendarEvent>>("/academic-calendar", params),
};

export const accreditationApi = {
  studyPrograms: (params: {
    page?: number;
    limit?: number;
    search?: string;
    level?: string;
    validUntilFrom?: string;
    validUntilTo?: string;
  }) => apiGet<Paged<StudyProgramAccreditation>>("/accreditation/study-programs", params),
};
