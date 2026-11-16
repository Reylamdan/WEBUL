"use client";

import { useEffect, useMemo, useState } from "react";
import "./tracer-study.css";
import { BarChart, DonutChart } from "./tracer-charts";
import {
  fetchTracerFilters,
  fetchTracerSummary,
  type TracerFilters,
  type TracerMetric,
  type TracerSummary,
} from "./tracer-types";

const nf = new Intl.NumberFormat("id-ID");
const idr = (v: number) =>
  v >= 1_000_000
    ? `Rp${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
    : `Rp${nf.format(Math.round(v))}`;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="ts-card ts-kpi">
      <span className="ts-kpi-label">{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function MetricCard({ metric }: { metric: TracerMetric }) {
  const note =
    metric.filter && metric.key === "f14"
      ? "Hanya alumni yang bekerja"
      : `${nf.format(metric.answered)} dari ${nf.format(metric.totalRespondents)} responden menjawab`;
  return (
    <section className={`ts-card ts-metric ts-metric-${metric.chart}`}>
      <header>
        <span className="ts-chip">{metric.code}</span>
        <h3>{metric.title}</h3>
        <p>{note}</p>
      </header>
      {metric.answered === 0 ? (
        <div className="ts-empty">Belum ada jawaban untuk pertanyaan ini.</div>
      ) : metric.chart === "donut" ? (
        <DonutChart items={metric.items} centerLabel="Responden" />
      ) : (
        <>
          <BarChart items={metric.items} />
          {metric.average != null && (
            <footer>
              Rata-rata:{" "}
              <b>
                {metric.unit === "IDR"
                  ? idr(metric.average)
                  : `${metric.average.toLocaleString("id-ID")} ${metric.unit ?? ""}`}
              </b>
            </footer>
          )}
        </>
      )}
    </section>
  );
}

export function TracerStudy() {
  const [filters, setFilters] = useState<TracerFilters>({ years: [], programs: [] });
  const [year, setYear] = useState<number | undefined>();
  const [program, setProgram] = useState<string>("");
  const [data, setData] = useState<TracerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    fetchTracerFilters(ac.signal).then(setFilters).catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchTracerSummary({ year, program: program || undefined }, ac.signal)
      .then(setData)
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e?.message ?? "Terjadi kesalahan");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [year, program, retry]);

  const byKey = useMemo(
    () => Object.fromEntries((data?.metrics ?? []).map((m) => [m.key, m])),
    [data],
  );
  const f8 = byKey.f8 as TracerMetric | undefined;
  const bekerja = f8?.items.find((i) => i.key === "bekerja");
  const f502 = byKey.f502 as TracerMetric | undefined;
  const f505 = byKey.f505 as TracerMetric | undefined;

  return (
    <div className="ts-root">
      <div className="ts-toolbar">
        <div>
          <h2>Statistik Tracer Study</h2>
          <p>Data agregat anonim dari survei alumni Universitas LIA.</p>
        </div>
        <div className="ts-filters">
          <label>
            <span>Tahun survei</span>
            <select
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Semua tahun</option>
              {filters.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Program studi</span>
            <select value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">Semua program</option>
              {filters.programs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="ts-card ts-error" role="alert">
          <strong>Data belum dapat dimuat</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="ts-btn">
            Coba lagi
          </button>
        </div>
      ) : (
        <div className={loading ? "ts-body is-loading" : "ts-body"}>
          {loading && !data ? (
            <div className="ts-grid-cards">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="ts-card ts-skeleton" />
              ))}
            </div>
          ) : data && data.totalRespondents === 0 ? (
            <div className="ts-card ts-empty">Belum ada data responden untuk filter ini.</div>
          ) : (
            data && (
              <>
                <div className="ts-kpis">
                  <Kpi label="Total responden" value={nf.format(data.totalRespondents)} />
                  <Kpi
                    label="Alumni bekerja"
                    value={bekerja ? `${bekerja.percentage.toLocaleString("id-ID")}%` : "–"}
                    hint={bekerja ? `${nf.format(bekerja.count)} alumni` : undefined}
                  />
                  <Kpi
                    label="Waktu tunggu kerja"
                    value={f502?.average != null ? `${f502.average.toLocaleString("id-ID")} bln` : "–"}
                    hint="rata-rata"
                  />
                  <Kpi
                    label="Take home pay"
                    value={f505?.average != null ? idr(f505.average) : "–"}
                    hint="rata-rata / bulan"
                  />
                </div>
                <div className="ts-grid-cards">
                  {data.metrics.map((m) => (
                    <MetricCard key={m.key} metric={m} />
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default TracerStudy;