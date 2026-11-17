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
  } catch (error) {
    if (isAbortError(error)) throw error;
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

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function apiGet<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  const url = buildUrl(path, params);
  // Request yang bisa dibatalkan tidak digabung dengan request lain agar pembatalan tidak memengaruhi pemanggil lain.
  if (signal) return request<T>(url, { signal });
  const existing = inflight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = request<T>(url);
  inflight.set(url, promise);
  const release = () => setTimeout(() => inflight.delete(url), DEDUPE_MS);
  promise.then(release, release);
  return promise;
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(buildUrl(path), {
    signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- Bahasa konten ----------

// Bahasa konten dinamis (berita & pengumuman). Backend hanya menerjemahkan konten yang sudah disetujui admin;
// selain itu respons tetap bahasa Indonesia dan ditandai `translated: false`.
export type ContentLang = "id" | "en";

const langParam = (lang?: ContentLang) => (lang === "en" ? "en" : undefined);

// ---------- Format ----------

const TIME_ZONE = "Asia/Jakarta";

export function formatDate(value: string | null | undefined, lang: ContentLang = "id"): string {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date);
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
  category: string | null;
  // Hanya ada pada respons ?lang=en: true bila teks berasal dari terjemahan yang disetujui admin.
  translated?: boolean;
  contentHtml?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | null;
  author: { id: string; name: string } | null;
  category: string | null;
  translated?: boolean;
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

// Agenda Acara (kehidupan kampus) — terpisah dari Kalender Akademik.
export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null; // "HH:MM"
  endTime: string | null;
  location: string | null;
  organizer: string | null;
  registrationUrl: string | null;
  category: CalendarCategory;
  // Gambar acara bersifat opsional; null = tampil dengan desain tanpa gambar.
  imageUrl?: string | null;
}

// Struktur Organisasi (profil): "bagan" = gambar bagan, "unit" = kartu unit / pimpinan.
export type OrganizationCategorySlug = "bagan" | "unit";

export interface OrganizationUnit {
  id: string;
  title: string;
  position: string | null;
  description: string | null;
  category: { slug: OrganizationCategorySlug; name: string };
  sortOrder: number;
  // Gambar opsional; null = tampil tanpa gambar.
  imageUrl: string | null;
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

// Tautan file dari backend (dokumen akreditasi, regulasi BAN-PT, lampiran). Bisa berupa path relatif "/api/...".
export interface FileLink {
  url: string | null;
  downloadUrl?: string | null;
}

export interface BanptAttachment extends FileLink {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  uploadedAt: string | null;
}

export interface BanptRegulation {
  id: string;
  regulationNumber: string;
  regulationYear: number;
  determinationDate: string | null;
  title: string;
  document: (FileLink & { mimeType: string; size?: number | null }) | null;
  attachments: BanptAttachment[];
  publishedAt: string | null;
}

export type SearchResultType =
  | "news"
  | "announcement"
  | "academic_calendar"
  | "accreditation_institution"
  | "accreditation_study_program"
  | "banpt_regulation";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  slug: string | null;
  excerpt: string;
  url: string;
  date: string | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  limit: number;
  results: SearchResult[];
  // Ada bila sebagian sumber pencarian gagal; hasil dari sumber lain tetap dikirim.
  partial?: boolean;
}

export type AssistantCitationType = SearchResultType | "knowledge";

export interface AssistantCitation {
  id: string;
  type: AssistantCitationType;
  label: string;
  title: string;
  url?: string;
  publishedAt: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AssistantFallback {
  type: "whatsapp";
  message: string;
  url: string | null;
}

export interface AssistantReply {
  answerable: boolean;
  answer: string | null;
  citations: AssistantCitation[];
  fallback: AssistantFallback | null;
}

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const newsApi = {
  list: (params: { page?: number; limit?: number; search?: string; category?: string; lang?: ContentLang }) =>
    apiGet<Paged<NewsItem>>("/news", { ...params, lang: langParam(params.lang) }),
  detail: (slug: string, lang?: ContentLang) =>
    apiGet<{ news: NewsItem }>(`/news/${encodeURIComponent(slug)}`, { lang: langParam(lang) }).then((d) => d.news),
  categories: () => apiGet<{ categories: string[] }>("/news/categories").then((d) => d.categories),
};

export const announcementApi = {
  list: (params: { page?: number; limit?: number; search?: string; category?: string; lang?: ContentLang }) =>
    apiGet<Paged<AnnouncementItem>>("/announcements", { ...params, lang: langParam(params.lang) }),
  detail: (slug: string, lang?: ContentLang) =>
    apiGet<{ announcement: AnnouncementItem }>(`/announcements/${encodeURIComponent(slug)}`, { lang: langParam(lang) }).then(
      (d) => d.announcement,
    ),
  categories: () => apiGet<{ categories: string[] }>("/announcements/categories").then((d) => d.categories),
};

export const calendarApi = {
  categories: () => apiGet<{ categories: CalendarCategory[] }>("/academic-calendar/categories").then((d) => d.categories),
  list: (params: { page?: number; limit?: number; category?: string; from?: string; to?: string }) =>
    apiGet<Paged<CalendarEvent>>("/academic-calendar", params),
};

export const organizationApi = {
  list: (params: { category?: OrganizationCategorySlug; limit?: number } = {}) =>
    apiGet<{ items: OrganizationUnit[] }>("/organization-units", params).then((d) => d.items),
};

export const agendaApi = {
  categories: () => apiGet<{ categories: CalendarCategory[] }>("/agenda-events/categories").then((d) => d.categories),
  list: (params: { page?: number; limit?: number; category?: string; from?: string; to?: string; search?: string }) =>
    apiGet<Paged<AgendaEvent>>("/agenda-events", params),
  detail: (id: string) => apiGet<{ event: AgendaEvent }>(`/agenda-events/${encodeURIComponent(id)}`).then((d) => d.event),
};

export interface InstitutionAccreditation {
  id: string;
  institutionName: string;
  rank: string;
  skNumber: string;
  decisionDate: string | null;
  validFrom: string | null;
  validUntil: string | null;
  issuingBody: string | null;
  document: { name: string; url: string | null; downloadUrl?: string | null } | null;
  publishedAt: string | null;
}

export const accreditationApi = {
  institutions: (params: { page?: number; limit?: number; search?: string }) =>
    apiGet<Paged<InstitutionAccreditation>>("/accreditation/institutions", params),
  studyPrograms: (params: {
    page?: number;
    limit?: number;
    search?: string;
    level?: string;
    validUntilFrom?: string;
    validUntilTo?: string;
  }) => apiGet<Paged<StudyProgramAccreditation>>("/accreditation/study-programs", params),
};

export const banptRegulationApi = {
  list: (params: { page?: number; limit?: number; search?: string; year?: number }) =>
    apiGet<Paged<BanptRegulation>>("/banpt-regulations", params),
  filterOptions: () => apiGet<{ years: number[] }>("/banpt-regulations/filter-options"),
};

export const searchApi = {
  search: (q: string, limit: number, signal?: AbortSignal) => apiGet<SearchResponse>("/search", { q, limit }, signal),
};

export const assistantApi = {
  chat: (question: string, history: AssistantHistoryMessage[], signal?: AbortSignal) =>
    apiPost<AssistantReply>("/assistant/chat", { question, history }, signal),
};