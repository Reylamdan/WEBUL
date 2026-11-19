import { ApiError, buildUrl, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";
export type ExpiryStatus = "active" | "expiring" | "expired" | "unknown";

export const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
  active: "Masih berlaku",
  expiring: "Segera berakhir",
  expired: "Kedaluwarsa",
  unknown: "Tanpa tanggal akhir",
};

export interface AccreditationDocument {
  name: string | null;
  mimeType: string | null;
  size: number | null;
  url: string | null;
  downloadUrl?: string;
  urlExpiresAt?: string | null;
}

interface AccreditationBase {
  id: string;
  rank: string;
  skNumber: string;
  decisionDate: string | null;
  validFrom: string | null;
  validUntil: string | null;
  issuingBody: string | null;
  document: AccreditationDocument | null;
  publishedAt: string | null;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInstitutionAccreditation extends AccreditationBase {
  institutionName: string;
}

export interface AdminStudyProgramAccreditation extends AccreditationBase {
  programName: string;
  educationLevel: string;
  faculty: string | null;
  expiryStatus: ExpiryStatus;
  daysUntilExpiry: number | null;
}

export interface InstitutionInput {
  institutionName?: string;
  rank?: string;
  skNumber?: string;
  decisionDate?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  issuingBody?: string;
  status?: PublishStatus;
}

export interface StudyProgramInput {
  programName?: string;
  educationLevel?: string;
  faculty?: string | null;
  rank?: string;
  skNumber?: string;
  decisionDate?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  issuingBody?: string;
  status?: PublishStatus;
}

export interface InstitutionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PublishStatus | "";
}

export interface StudyProgramListParams extends InstitutionListParams {
  level?: string;
  rank?: string;
  expiryStatus?: ExpiryStatus | "";
}

export interface StudyProgramFilterOptions {
  levels: string[];
  ranks: string[];
  years?: number[];
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
  params?: Record<string, string | number | undefined>,
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
      body?.code,
    );
  }
  return body;
}

// Fabrik CRUD: institusi dan program studi memakai kontrak endpoint yang sama.
function createCrud<TItem, TInput, TParams extends object>(base: string) {
  const one = (id: string) => `${base}/${encodeURIComponent(id)}`;
  return {
    list: (params?: TParams) =>
      adminRequest<Paged<TItem>>(base, {}, cleanParams(params)).then((r) => r.data!),

    create: (input: TInput) =>
      adminRequest<{ accreditation: TItem }>(base, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.data!.accreditation),

    update: (id: string, input: Partial<TInput>) =>
      adminRequest<{ accreditation: TItem }>(one(id), {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.data!.accreditation),

    remove: (id: string) => adminRequest<undefined>(one(id), { method: "DELETE" }),

    uploadDocument: (id: string, file: File) => {
      const body = new FormData();
      body.append("document", file);
      return adminRequest<{ accreditation: TItem }>(`${one(id)}/document`, {
        method: "PUT",
        body,
      }).then((r) => r.data!.accreditation);
    },

    removeDocument: (id: string) =>
      adminRequest<{ accreditation: TItem }>(`${one(id)}/document`, {
        method: "DELETE",
      }).then((r) => r.data!.accreditation),
  };
}

function cleanParams(params?: object): Record<string, string | number | undefined> {
  const result: Record<string, string | number | undefined> = {};
  if (!params) return result;
  for (const [key, value] of Object.entries(params)) {
    if (value === "" || value === null || value === undefined) continue;
    result[key] = value as string | number;
  }
  return result;
}

export const institutionAdminApi = createCrud<
  AdminInstitutionAccreditation,
  InstitutionInput,
  InstitutionListParams
>("/admin/accreditation/institutions");

const studyProgramCrud = createCrud<
  AdminStudyProgramAccreditation,
  StudyProgramInput,
  StudyProgramListParams
>("/admin/accreditation/study-programs");

export const studyProgramAdminApi = {
  ...studyProgramCrud,
  filterOptions: () =>
    adminRequest<StudyProgramFilterOptions>("/admin/accreditation/study-programs/filter-options").then(
      (r) => r.data!,
    ),
};
