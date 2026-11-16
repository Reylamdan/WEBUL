import { API_BASE_URL, ApiError, buildUrl } from "@/lib/api";

type AdminIdentity = {
  id: string;
  name: string;
  email: string;
};

export type AdminProfile = AdminIdentity & {
  lastLoginAt: string | null;
  createdAt: string | null;
};

export type AdminSession = {
  token: string;
  expiresAt: string;
  admin: AdminProfile;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
};

type LoginResponse = {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  admin: AdminIdentity;
};

type CurrentAdminResponse = {
  admin: AdminProfile;
};

const SESSION_KEY = "webul-admin-session";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAdminIdentity(value: unknown): value is AdminIdentity {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string"
  );
}

function isAdminProfile(value: unknown): value is AdminProfile {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (typeof value.lastLoginAt === "string" || value.lastLoginAt === null) &&
    (typeof value.createdAt === "string" || value.createdAt === null)
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Alamat backend belum dikonfigurasi. Isi NEXT_PUBLIC_API_URL pada frontend.",
      0,
      "API_NOT_CONFIGURED",
    );
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      cache: "no-store",
      ...init,
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      0,
      "NETWORK_ERROR",
    );
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (
    !response.ok ||
    !envelope ||
    envelope.success !== true ||
    envelope.data === undefined
  ) {
    throw new ApiError(
      envelope?.message ?? "Respons backend tidak valid. Silakan coba lagi.",
      response.status,
      envelope?.code ?? "INVALID_API_RESPONSE",
    );
  }

  return envelope.data;
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminSession> {
  const login = await request<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (
    !isRecord(login) ||
    typeof login.token !== "string" ||
    !login.token ||
    login.tokenType !== "Bearer" ||
    typeof login.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(login.expiresAt)) ||
    !isAdminIdentity(login.admin)
  ) {
    throw new ApiError(
      "Respons login backend tidak sesuai format yang diharapkan.",
      502,
      "INVALID_LOGIN_RESPONSE",
    );
  }

  const admin = await verifyAdminSession(login.token);
  if (
    admin.id !== login.admin.id ||
    admin.email.toLowerCase() !== login.admin.email.toLowerCase()
  ) {
    throw new ApiError(
      "Akun tidak memiliki akses administrator.",
      403,
      "ADMIN_VERIFICATION_FAILED",
    );
  }

  return {
    token: login.token,
    expiresAt: login.expiresAt,
    admin,
  };
}

export async function verifyAdminSession(token: string): Promise<AdminProfile> {
  const current = await request<CurrentAdminResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!isRecord(current) || !isAdminProfile(current.admin)) {
    throw new ApiError(
      "Respons verifikasi administrator tidak sesuai format.",
      502,
      "INVALID_ADMIN_RESPONSE",
    );
  }

  return current.admin;
}

export function storeAdminSession(session: AdminSession): void {
  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw new ApiError("Sesi login telah berakhir. Silakan masuk kembali.", 401, "TOKEN_EXPIRED");
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as AdminSession;
    if (
      typeof session.token !== "string" ||
      !session.token ||
      typeof session.expiresAt !== "string" ||
      Date.parse(session.expiresAt) <= Date.now() ||
      !isAdminProfile(session.admin)
    ) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function getAdminAuthorizationHeaders(): Record<string, string> {
  const session = getAdminSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
