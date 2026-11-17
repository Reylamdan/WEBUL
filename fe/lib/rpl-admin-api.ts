import {
  ApiError,
  buildUrl,
  type Paged,
  type RplFeeItem,
  type RplRequirementItem,
  type RplScheduleItem,
  type RplSettings,
  type RplStepItem,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminRplStep extends RplStepItem {
  status: PublishStatus;
}

export interface AdminRplRequirement extends RplRequirementItem {
  status: PublishStatus;
}

export interface AdminRplSchedule extends RplScheduleItem {
  status: PublishStatus;
}

export interface AdminRplFee extends RplFeeItem {
  status: PublishStatus;
}

export interface RplStepInput {
  title: string;
  description: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface RplRequirementInput {
  type: "syarat" | "dokumen";
  title: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface RplScheduleInput {
  day: string;
  hours: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface RplFeeInput {
  type: string;
  amount: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface RplSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroArtMark?: string;
  heroArtCaption?: string;
  sectionEyebrow?: string;
  sectionTitle?: string;
  benefits?: string[];
  scheduleNote?: string;
  registrationDeadline?: string;
  registrationUrl?: string;
  transferCreditTitle?: string;
  transferCreditDescription?: string;
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

const base = "/admin/rpl";

export const rplAdminApi = {
  // Settings
  getSettings: () =>
    adminRequest<{ settings: RplSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: RplSettingsInput) =>
    adminRequest<{ settings: RplSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // Steps
  listSteps: (params?: { page?: number; limit?: number; status?: PublishStatus | ""; search?: string }) =>
    adminRequest<Paged<AdminRplStep>>(`${base}/steps`, {}, params).then((r) => r.data!),

  getStep: (id: string) =>
    adminRequest<{ step: AdminRplStep }>(`${base}/steps/${id}`).then((r) => r.data!.step),

  createStep: (input: RplStepInput) =>
    adminRequest<{ step: AdminRplStep }>(`${base}/steps`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.step),

  updateStep: (id: string, input: Partial<RplStepInput>) =>
    adminRequest<{ step: AdminRplStep }>(`${base}/steps/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.step),

  removeStep: (id: string) =>
    adminRequest<void>(`${base}/steps/${id}`, { method: "DELETE" }).then(() => undefined),

  // Requirements & Documents
  listRequirements: (params?: {
    page?: number;
    limit?: number;
    type?: "syarat" | "dokumen" | "";
    status?: PublishStatus | "";
    search?: string;
  }) => adminRequest<Paged<AdminRplRequirement>>(`${base}/requirements`, {}, params).then((r) => r.data!),

  createRequirement: (input: RplRequirementInput) =>
    adminRequest<{ item: AdminRplRequirement }>(`${base}/requirements`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  updateRequirement: (id: string, input: Partial<RplRequirementInput>) =>
    adminRequest<{ item: AdminRplRequirement }>(`${base}/requirements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  removeRequirement: (id: string) =>
    adminRequest<void>(`${base}/requirements/${id}`, { method: "DELETE" }).then(() => undefined),

  // Schedules
  listSchedules: () =>
    adminRequest<{ items: AdminRplSchedule[] }>(`${base}/schedules`).then((r) => r.data!.items),

  createSchedule: (input: RplScheduleInput) =>
    adminRequest<{ item: AdminRplSchedule }>(`${base}/schedules`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  updateSchedule: (id: string, input: Partial<RplScheduleInput>) =>
    adminRequest<{ item: AdminRplSchedule }>(`${base}/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  removeSchedule: (id: string) =>
    adminRequest<void>(`${base}/schedules/${id}`, { method: "DELETE" }).then(() => undefined),

  // Fees
  listFees: () =>
    adminRequest<{ items: AdminRplFee[] }>(`${base}/fees`).then((r) => r.data!.items),

  createFee: (input: RplFeeInput) =>
    adminRequest<{ item: AdminRplFee }>(`${base}/fees`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  updateFee: (id: string, input: Partial<RplFeeInput>) =>
    adminRequest<{ item: AdminRplFee }>(`${base}/fees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.item),

  removeFee: (id: string) =>
    adminRequest<void>(`${base}/fees/${id}`, { method: "DELETE" }).then(() => undefined),
};

