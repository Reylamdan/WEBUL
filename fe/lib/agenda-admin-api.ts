import { ApiError, buildUrl, type AgendaEvent, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Agenda Acara (butuh login admin). Semua panggilan memakai token sesi admin.

export type AgendaStatus = "draft" | "published";

export interface AdminAgendaEvent extends AgendaEvent {
  status: AgendaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaCategoryOption {
  slug: string;
  name: string;
  description?: string;
}

// Bentuk data yang dikirim ke backend (create & update).
export interface AgendaEventInput {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  organizer: string | null;
  registrationUrl: string | null;
  category: string;
  status: AgendaStatus;
}

export interface AgendaAdminListParams {
  page?: number;
  limit?: number;
  status?: AgendaStatus | "";
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
        // FormData (upload gambar) harus diberi boundary otomatis oleh browser, jadi tanpa Content-Type manual.
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

export const agendaAdminApi = {
  categories: () =>
    adminRequest<{ categories: AgendaCategoryOption[] }>("/admin/agenda-events/categories").then((r) => r.data!.categories),

  list: (params: AgendaAdminListParams) =>
    adminRequest<Paged<AdminAgendaEvent>>("/admin/agenda-events", {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  create: (input: AgendaEventInput) =>
    adminRequest<{ event: AdminAgendaEvent }>("/admin/agenda-events", { method: "POST", body: JSON.stringify(input) }).then(
      (r) => r.data!.event,
    ),

  update: (id: string, input: Partial<AgendaEventInput>) =>
    adminRequest<{ event: AdminAgendaEvent }>(`/admin/agenda-events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.event),

  // Gambar opsional. Field multipart bernama "cover" (sama seperti cover berita).
  uploadImage: (id: string, file: File) => {
    const body = new FormData();
    body.append("cover", file);
    return adminRequest<{ event: AdminAgendaEvent }>(`/admin/agenda-events/${encodeURIComponent(id)}/image`, {
      method: "PUT",
      body,
    }).then((r) => r.data!.event);
  },

  removeImage: (id: string) =>
    adminRequest<{ event: AdminAgendaEvent }>(`/admin/agenda-events/${encodeURIComponent(id)}/image`, {
      method: "DELETE",
    }).then((r) => r.data!.event),

  remove: (id: string) => adminRequest<undefined>(`/admin/agenda-events/${encodeURIComponent(id)}`, { method: "DELETE" }),
};