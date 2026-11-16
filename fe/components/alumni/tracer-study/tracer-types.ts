export type TracerItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type TracerMetric = {
  key: string;
  code: string;
  title: string;
  type: "categories" | "ranges";
  chart: "donut" | "bar";
  totalRespondents: number;
  answered: number;
  unanswered: number;
  items: TracerItem[];
  unit?: string;
  average?: number | null;
  filter?: { field: string; equals: number };
};

export type TracerSummary = {
  filters: { year: number | null; program: number | string | null };
  totalRespondents: number;
  metrics: TracerMetric[];
};

export type TracerFilters = { years: number[]; programs: string[] };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}/api/tracer-study${path}`, { signal });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? "Gagal memuat data tracer study");
  }
  return json.data as T;
}

export const fetchTracerFilters = (signal?: AbortSignal) => get<TracerFilters>("/filters", signal);

export const fetchTracerSummary = (
  params: { year?: number; program?: string },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params.year !== undefined) q.set("year", String(params.year));
  if (params.program) q.set("program", params.program);
  const qs = q.toString();
  return get<TracerSummary>(`/summary${qs ? `?${qs}` : ""}`, signal);
};