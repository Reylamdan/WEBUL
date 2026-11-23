import { ApiError, buildUrl, type Paged } from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

// Klien API admin Assistant Knowledge (butuh login admin).
// Backend: /api/admin/assistant-knowledge (GET daftar, GET :id, POST, PATCH :id, DELETE :id).

export type KnowledgeStatus = "draft" | "published";

export interface AdminKnowledge {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  sourceLabel: string | null;
  sourcePath: string | null;
  status: KnowledgeStatus;
  // Format YYYY-MM-DD, null = tanpa batas berlaku.
  validUntil: string | null;
  createdBy: { id: string; name: string | null } | null;
  updatedBy: { id: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
  // Hanya ada pada detail (GET /:id), tidak ada pada daftar.
  content?: string;
}

export interface KnowledgeInput {
  title: string;
  category: string;
  content: string;
  keywords: string[];
  sourceLabel: string | null;
  sourcePath: string | null;
  status: KnowledgeStatus;
  validUntil: string | null;
}

export type KnowledgeUpdateInput = Partial<KnowledgeInput>;

export interface KnowledgeListParams {
  page?: number;
  limit?: number;
  status?: KnowledgeStatus | "";
  category?: string;
  search?: string;
}

// Batas mengikuti validator backend (assistantKnowledgeValidator.js).
export const KNOWLEDGE_LIMITS = {
  title: 200,
  category: 60,
  content: 10000,
  keywordsMax: 20,
  keywordLength: 50,
  sourceLabel: 200,
  sourcePath: 500,
} as const;

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
    const details = body?.errors?.map((item) => item.message).join(" ");
    throw new ApiError(
      [body?.message, details].filter(Boolean).join(": ") || "Terjadi kesalahan pada server.",
      response.status,
      body?.code,
    );
  }
  return body;
}

export const assistantKnowledgeAdminApi = {
  list: (params: KnowledgeListParams) =>
    adminRequest<Paged<AdminKnowledge>>("/admin/assistant-knowledge", {}, {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
    }).then((r) => r.data!),

  // Detail memuat content (daftar tidak).
  detail: (id: string) =>
    adminRequest<{ knowledge: AdminKnowledge }>(`/admin/assistant-knowledge/${encodeURIComponent(id)}`).then(
      (r) => r.data!.knowledge,
    ),

  create: (input: KnowledgeInput) =>
    adminRequest<{ knowledge: AdminKnowledge }>("/admin/assistant-knowledge", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.knowledge),

  update: (id: string, input: KnowledgeUpdateInput) =>
    adminRequest<{ knowledge: AdminKnowledge }>(`/admin/assistant-knowledge/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.knowledge),

  remove: (id: string) =>
    adminRequest<undefined>(`/admin/assistant-knowledge/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
