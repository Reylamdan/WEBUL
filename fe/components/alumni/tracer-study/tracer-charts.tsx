"use client";

import { useMemo } from "react";
import type { TracerItem } from "./tracer-types";

import { Bar } from "@/components/charts/bar";
import { BarChart as BklitBarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartTooltip } from "@/components/charts/tooltip";

/** Warna seri, diambil dari tema situs lewat tracer-study.css (ada fallback hex). */
export const SERIES = [
  "var(--ts-c1, #005b8c)",
  "var(--ts-c2, #1f9d8b)",
  "var(--ts-c3, #e0a526)",
  "var(--ts-c4, #d9604c)",
  "var(--ts-c5, #6b5fb5)",
  "var(--ts-c6, #7b8c97)",
];

/** Label singkat untuk sumbu X (key dari backend: config/tracerStudyMetrics.js). */
const SHORT_LABELS: Record<string, string> = {
  "sebelum-lulus": "Sebelum lulus",
  "0-6-bulan": "0–6 bln",
  "7-12-bulan": "7–12 bln",
  "lebih-12-bulan": "> 12 bln",
  "sd-1-5jt": "≤ 1,5 jt",
  "1-5-2-5jt": "1,5–2,5 jt",
  "2-5-5jt": "2,5–5 jt",
  "5-10jt": "5–10 jt",
  "10-20jt": "10–20 jt",
  "di-atas-20jt": "> 20 jt",
};
const shortLabel = (item: TracerItem) =>
  SHORT_LABELS[item.key] ?? (item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label);

const nf = new Intl.NumberFormat("id-ID");
const pct = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

/* ------------------------------------------------------------------ */
/* Ring (Bklit PieChart dengan lubang tengah)                          */
/* ------------------------------------------------------------------ */

export function DonutChart({ items, centerLabel }: { items: TracerItem[]; centerLabel: string }) {
  const total = items.reduce((s, i) => s + i.count, 0);

  const pieData = useMemo(
    () =>
      items.map((item, idx) => ({
        label: item.label,
        value: item.count,
        color: SERIES[idx % SERIES.length],
      })),
    [items],
  );

  return (
    <div className="ts-donut">
      <div className="ts-pie">
        <PieChart
          data={pieData}
          size={220}
          innerRadius={74}
          padAngle={0.02}
          cornerRadius={6}
          hoverOffset={8}
          startAngle={(-90 * Math.PI) / 180}
          endAngle={(270 * Math.PI) / 180}
          enterTransition={{ type: "tween", duration: 1.1, ease: [0.85, 0, 0.15, 1] }}
          enterStaggerScale={1.0}
        >
          {pieData.map((_, i) => (
            <PieSlice key={i} index={i} hoverEffect="translate" />
          ))}
        </PieChart>
        <div className="ts-pie-center">
          <strong>{nf.format(total)}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <ul className="ts-legend">
        {items.map((item, idx) => {
          const color = SERIES[idx % SERIES.length];
          return (
            <li key={item.key} className={item.count === 0 ? "is-zero" : ""}>
              <i style={{ background: color }} />
              <span className="ts-legend-label">{item.label}</span>
              <span className="ts-legend-value">
                {nf.format(item.count)} <em>{pct(item.percentage)}</em>
              </span>
              <span className="ts-legend-bar">
                <b style={{ width: `${item.percentage}%`, background: color }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bar (Bklit BarChart vertikal) + tabel label lengkap                 */
/* ------------------------------------------------------------------ */

export function BarChart({ items, color = SERIES[0] }: { items: TracerItem[]; color?: string }) {
  // dataKey "Alumni" otomatis jadi nama baris di tooltip.
  const data = useMemo(
    () => items.map((i) => ({ label: shortLabel(i), Alumni: i.count })),
    [items],
  );

  return (
    <div className="ts-bklit">
      <BklitBarChart
        data={data}
        xDataKey="label"
        aspectRatio="2 / 1"
        animationDuration={1100}
        animationEasing="cubic-bezier(0.85, 0, 0.15, 1)"
        barGap={0.3}
      >
        <Grid horizontal />
        <Bar dataKey="Alumni" lineCap="round" fill={color} fadedOpacity={0.3} />
        <BarXAxis />
        <ChartTooltip />
      </BklitBarChart>

      <table className="ts-table">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Alumni</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className={item.count === 0 ? "is-zero" : ""}>
              <td>{item.label}</td>
              <td>{nf.format(item.count)}</td>
              <td>{pct(item.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}