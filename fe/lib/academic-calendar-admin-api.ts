import { ApiError, buildUrl, type CalendarCategory, type CalendarEvent, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type CalendarStatus = "draft" | "published";

export interface AdminCalendarEvent extends CalendarEvent {
  status: CalendarStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  category: string;
  status: CalendarStatus;
}

export interface CalendarAdminListParams {
  page?: number;
  limit?: number;
  status?: CalendarStatus | "";
  category?: string;
  from?: string;
  to?: string;
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

const base = "/admin/academic-calendar";

export const academicCalendarAdminApi = {
  categories: () =>
    fetch(buildUrl("/academic-calendar/categories"), { cache: "no-store" })
      .then((r) => r.json() as Promise<Envelope<{ categories: CalendarCategory[] }>>)
      .then((r) => r.data?.categories ?? []),

  list: (params: CalendarAdminListParams) =>
    adminRequest<Paged<AdminCalendarEvent>>(base, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  get: (id: string) =>
    adminRequest<{ event: AdminCalendarEvent }>(`${base}/${encodeURIComponent(id)}`).then((r) => r.data!.event),

  create: (input: CalendarEventInput) =>
    adminRequest<{ event: AdminCalendarEvent }>(base, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.event),

  update: (id: string, input: Partial<CalendarEventInput>) =>
    adminRequest<{ event: AdminCalendarEvent }>(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.event),

  remove: (id: string) =>
    adminRequest<undefined>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

