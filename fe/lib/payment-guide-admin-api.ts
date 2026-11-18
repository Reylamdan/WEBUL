import {
  ApiError,
  buildUrl,
  type Paged,
  type PaymentChannelItem,
  type PaymentGuideSettings,
  type PaymentVaStepItem,
} from "./api";
import { getAdminAuthorizationHeaders } from "./admin-auth";

export type PublishStatus = "draft" | "published";

export interface AdminPaymentVaStep extends PaymentVaStepItem {
  status: PublishStatus;
}

export interface AdminPaymentChannel extends PaymentChannelItem {
  status: PublishStatus;
}

export interface PaymentVaStepInput {
  title: string;
  description: string;
  sortOrder: number;
  status: PublishStatus;
}

export interface PaymentChannelInput {
  channelId: string;
  name: string;
  steps: string[];
  note?: string | null;
  technicalNoteTitle?: string | null;
  technicalNote?: string | null;
  sortOrder: number;
  status: PublishStatus;
}

export interface PaymentGuideSettingsInput {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  vaSectionEyebrow?: string;
  vaSectionTitle?: string;
  vaSectionDescription?: string;
  vaImage1Url?: string;
  vaImage1Alt?: string;
  vaImage1Caption?: string;
  vaImage2Url?: string;
  vaImage2Alt?: string;
  vaImage2Caption?: string;
  methodsSectionEyebrow?: string;
  methodsSectionTitle?: string;
  methodsSectionDescription?: string;
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

const base = "/admin/payment-guide";

export const paymentGuideAdminApi = {
  // Settings
  getSettings: () =>
    adminRequest<{ settings: PaymentGuideSettings }>(`${base}/settings`).then((r) => r.data!.settings),

  updateSettings: (input: PaymentGuideSettingsInput) =>
    adminRequest<{ settings: PaymentGuideSettings }>(`${base}/settings`, {
      method: "PUT",
      body: JSON.stringify(input),
    }).then((r) => r.data!.settings),

  // VA Steps (Panduan SiAkad)
  listVaSteps: (params?: { page?: number; limit?: number; status?: PublishStatus | ""; search?: string }) =>
    adminRequest<Paged<AdminPaymentVaStep>>(`${base}/va-steps`, {}, params).then((r) => r.data!),

  getVaStep: (id: string) =>
    adminRequest<{ step: AdminPaymentVaStep }>(`${base}/va-steps/${id}`).then((r) => r.data!.step),

  createVaStep: (input: PaymentVaStepInput) =>
    adminRequest<{ step: AdminPaymentVaStep }>(`${base}/va-steps`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.step),

  updateVaStep: (id: string, input: Partial<PaymentVaStepInput>) =>
    adminRequest<{ step: AdminPaymentVaStep }>(`${base}/va-steps/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.step),

  removeVaStep: (id: string) =>
    adminRequest<void>(`${base}/va-steps/${id}`, { method: "DELETE" }).then(() => undefined),

  // Channels (Kanal Pembayaran)
  listChannels: (params?: { page?: number; limit?: number; status?: PublishStatus | ""; search?: string }) =>
    adminRequest<Paged<AdminPaymentChannel>>(`${base}/channels`, {}, params).then((r) => r.data!),

  getChannel: (id: string) =>
    adminRequest<{ channel: AdminPaymentChannel }>(`${base}/channels/${id}`).then((r) => r.data!.channel),

  createChannel: (input: PaymentChannelInput) =>
    adminRequest<{ channel: AdminPaymentChannel }>(`${base}/channels`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.data!.channel),

  updateChannel: (id: string, input: Partial<PaymentChannelInput>) =>
    adminRequest<{ channel: AdminPaymentChannel }>(`${base}/channels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.data!.channel),

  removeChannel: (id: string) =>
    adminRequest<void>(`${base}/channels/${id}`, { method: "DELETE" }).then(() => undefined),
};

