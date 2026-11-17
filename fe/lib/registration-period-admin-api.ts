import {
  ApiError,
  buildUrl,
  type Paged,
  type RegistrationActivity,
  type RegistrationPeriodSettings,
  type RegistrationWaveItem,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type WaveStatus = "draft" | "published";

export interface AdminRegistrationWave extends RegistrationWaveItem {
  status: WaveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationWaveInput {
  name: string;
  label?: string | null;
  activities: RegistrationActivity[];
  sortOrder: number;
  status: WaveStatus;
}

export interface RegistrationPeriodSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionDescription?: string;
}

export interface RegistrationWaveListParams {
  page?: number;
  limit?: number;
  status?: WaveStatus | "";
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

const base = "/admin/registration-periods";

export const registrationPeriodAdminApi = {
  // Pengaturan Teks Header & Tahapan
  getSettings: () =>
    adminRequest<{ settings: RegistrationPeriodSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: RegistrationPeriodSettingsInput) =>
    adminRequest<{ settings: RegistrationPeriodSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // CRUD Gelombang Pendaftaran
  listWaves: (params: RegistrationWaveListParams) =>
    adminRequest<Paged<AdminRegistrationWave>>(`${base}/waves`, {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  getWave: (id: string) =>
    adminRequest<{ wave: AdminRegistrationWave }>(`${base}/waves/${encodeURIComponent(id)}`).then(
      (r) => r.data!.wave
    ),

  createWave: (input: RegistrationWaveInput) =>
    adminRequest<{ wave: AdminRegistrationWave }>(`${base}/waves`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.wave),

  updateWave: (id: string, input: Partial<RegistrationWaveInput>) =>
    adminRequest<{ wave: AdminRegistrationWave }>(`${base}/waves/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.wave),

  removeWave: (id: string) =>
    adminRequest<undefined>(`${base}/waves/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

