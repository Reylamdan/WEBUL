// Klien API pengiriman form tracer study oleh alumni (publik, tanpa login).

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

export type SubmissionChannel = "form" | "basketball";

export interface AlumniPayload {
  fullName: string;
  nim: string;
  studyProgram: string;
  graduationYear: number;
  email: string;
  phone: string | null;
}

export interface TracerPayload {
  f8: number;
  f14: number | null;
  f502: number | null;
  f505: number | null;
}

export class SubmitError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SubmitError";
    this.status = status;
    this.code = code;
  }
}

export async function submitTracerStudy(
  body: { alumni: AlumniPayload; tracer: TracerPayload; channel: SubmissionChannel },
  signal?: AbortSignal,
) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/tracer-study/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new SubmitError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.", 0);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const detail = Array.isArray(json?.details) ? json.details[0]?.message : undefined;
    const message = detail ? `${json?.message ?? "Data tidak valid"}: ${detail}` : (json?.message ?? "Gagal mengirim form");
    throw new SubmitError(message, res.status, json?.code);
  }
  return json.data as { surveyYear: number };
}
