import { ApiError, buildUrl, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Tracer Study (butuh login admin). Semua panggilan memakai token sesi admin.

export interface TracerResponse {
  id: string | number;
  surveyYear: number;
  studyProgram: string | null;
  f8: number | null;
  f14: number | null;
  f502: number | null;
  f505: number | null;
}

// Bentuk data yang dikirim ke backend (tambah, ubah, dan baris import).
export interface TracerAnswersInput {
  studyProgram: string | null;
  f8: number;
  f14: number | null;
  f502: number | null;
  f505: number | null;
}

export interface TracerResponseInput extends TracerAnswersInput {
  surveyYear: number;
}

export type TracerImportMode = "append" | "replace";

export interface TracerYearSummary {
  year: number;
  total: number;
}

export interface TracerYearsData {
  years: TracerYearSummary[];
  programs: string[];
}

export interface TracerImportResult {
  surveyYear: number;
  mode: TracerImportMode;
  inserted: number;
  removed: number;
}

export interface TracerListParams {
  page?: number;
  limit?: number;
  year?: number | "";
  program?: string;
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
    const details = body?.errors
      ?.slice(0, 5)
      .map((item) => (item.field ? `${item.field}: ${item.message}` : item.message))
      .join("; ");
    throw new ApiError(
      [body?.message, details].filter(Boolean).join(": ") || "Terjadi kesalahan pada server.",
      response.status,
      body?.code,
    );
  }
  return body;
}

export const tracerAdminApi = {
  years: () => adminRequest<TracerYearsData>("/admin/tracer-study/years").then((r) => r.data!),

  list: (params: TracerListParams) =>
    adminRequest<Paged<TracerResponse>>("/admin/tracer-study/responses", {}, {
      page: params.page,
      limit: params.limit,
      year: params.year === "" ? undefined : params.year,
      program: params.program || undefined,
    }).then((r) => r.data!),

  create: (input: TracerResponseInput) =>
    adminRequest<{ response: TracerResponse }>("/admin/tracer-study/responses", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.response),

  update: (id: string | number, input: Partial<TracerResponseInput>) =>
    adminRequest<{ response: TracerResponse }>(`/admin/tracer-study/responses/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.response),

  remove: (id: string | number) =>
    adminRequest<undefined>(`/admin/tracer-study/responses/${encodeURIComponent(String(id))}`, { method: "DELETE" }),

  importRows: (surveyYear: number, mode: TracerImportMode, rows: TracerAnswersInput[]) =>
    adminRequest<TracerImportResult>("/admin/tracer-study/import", {
      method: "POST",
      body: JSON.stringify({ surveyYear, mode, rows }),
    }).then((r) => r.data!),

  // Menghapus SELURUH data satu tahun survei; backend mewajibkan confirm sama dengan tahun.
  removeYear: (year: number) =>
    adminRequest<{ surveyYear: number; removed: number }>(
      `/admin/tracer-study/years/${year}`,
      { method: "DELETE" },
      { confirm: year },
    ).then((r) => r.data!),
};
