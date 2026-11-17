import { ApiError, buildUrl, type CurriculumProgramItem, type CurriculumSettings, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type ProgramStatus = "draft" | "published";

export interface AdminCurriculumProgram extends CurriculumProgramItem {
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumProgramInput {
  name: string;
  href: string;
  focus: string;
  components: string;
  sortOrder: number;
  status: ProgramStatus;
}

export interface CurriculumSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  obeTitle?: string;
  obeLead?: string;
  obeDescription?: string;
  tableEyebrow?: string;
  tableTitle?: string;
  tableIntro?: string;
  tableNote?: string;
}

export interface CurriculumProgramListParams {
  page?: number;
  limit?: number;
  status?: ProgramStatus | "";
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

const base = "/admin/curriculum";

export const curriculumAdminApi = {
  // Pengaturan Teks Kurikulum & OBE
  getSettings: () =>
    adminRequest<{ settings: CurriculumSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: CurriculumSettingsInput) =>
    adminRequest<{ settings: CurriculumSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // CRUD Program Studi Kurikulum
  listPrograms: (params: CurriculumProgramListParams) =>
    adminRequest<Paged<AdminCurriculumProgram>>(`${base}/programs`, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  getProgram: (id: string) =>
    adminRequest<{ program: AdminCurriculumProgram }>(`${base}/programs/${encodeURIComponent(id)}`).then(
      (r) => r.data!.program
    ),

  createProgram: (input: CurriculumProgramInput) =>
    adminRequest<{ program: AdminCurriculumProgram }>(`${base}/programs`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.program),

  updateProgram: (id: string, input: Partial<CurriculumProgramInput>) =>
    adminRequest<{ program: AdminCurriculumProgram }>(`${base}/programs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.program),

  removeProgram: (id: string) =>
    adminRequest<undefined>(`${base}/programs/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

