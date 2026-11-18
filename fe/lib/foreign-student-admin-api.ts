import {
  ApiError,
  buildUrl,
  type Paged,
  type ForeignStudentSettings,
  type ForeignStudentRequirementItem,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminForeignStudentRequirement extends ForeignStudentRequirementItem {
  status: PublishStatus;
}

export interface ForeignStudentRequirementInput {
  title?: string | null;
  description: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface ForeignStudentSettingsInput {
  heroTitle?: string;
  introEyebrow?: string;
  introTitle?: string;
  introDescription?: string;
  requirementsEyebrow?: string;
  requirementsTitle?: string;
  requirementsDescription?: string;
  referenceTitle?: string;
  referenceDescription?: string;
  referenceUrl?: string;
  referenceLabel?: string;
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

const base = "/admin/foreign-students";

export const foreignStudentAdminApi = {
  // Settings
  getSettings: () =>
    adminRequest<{ settings: ForeignStudentSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: ForeignStudentSettingsInput) =>
    adminRequest<{ settings: ForeignStudentSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // Requirements (Dokumen Persyaratan)
  listRequirements: (params?: { page?: number; limit?: number; status?: PublishStatus | ""; search?: string }) =>
    adminRequest<Paged<AdminForeignStudentRequirement>>(`${base}/requirements`, {}, params).then((r) => r.data!),

  getRequirement: (id: string) =>
    adminRequest<{ requirement: AdminForeignStudentRequirement }>(`${base}/requirements/${id}`).then(
      (r) => r.data!.requirement
    ),

  createRequirement: (input: ForeignStudentRequirementInput) =>
    adminRequest<{ requirement: AdminForeignStudentRequirement }>(`${base}/requirements`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.requirement),

  updateRequirement: (id: string, input: Partial<ForeignStudentRequirementInput>) =>
    adminRequest<{ requirement: AdminForeignStudentRequirement }>(`${base}/requirements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.requirement),

  deleteRequirement: (id: string) =>
    adminRequest<{ id: string }>(`${base}/requirements/${id}`, {
      method: "DELETE",
    }).then((r) => r.data!),
};

