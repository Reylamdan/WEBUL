"use client";

import { useEffect, useId, useState } from "react";
import { Pagination } from "@/components/pagination";
import { ScrollReveal } from "@/components/scroll-reveal";
import { calendarApi, dateParts, errorMessage, formatDate, todayIso, type CalendarEvent } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Backend membatasi maksimal 100 agenda per permintaan.
const PAGE_LIMIT = 100;

function rangeFor(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  if (month === 0) return { from: `${year}-01-01`, to: `${year}-12-31` };
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

function dateRange(event: CalendarEvent): string {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  return end && end !== start ? `${start} – ${end}` : start;
}

// Tanggal hari ini hanya dibaca di browser (useEffect) agar tidak ikut dievaluasi saat prerender.
export function KalenderAgenda() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(todayIso());
  }, []);

  if (!today) {
    return (
      <section aria-labelledby="kalender-agenda-title" className="academic-agenda">
        <div className="academic-agenda-head">
          <h2 id="kalender-agenda-title">Agenda Akademik</h2>
        </div>
        <p aria-live="polite" className="academic-agenda-state">
          Memuat agenda akademik...
        </p>
      </section>
    );
  }

  return <KalenderAgendaContent today={today} />;
}

function KalenderAgendaContent({ today }: { today: string }) {
  const currentYear = Number(today.slice(0, 4));
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [category, setCategory] = useState("");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0);
  const [page, setPage] = useState(1);
  const yearId = useId();
  const monthId = useId();

  const categories = useApi("kalender-categories", calendarApi.categories);
  const { from, to } = rangeFor(year, month);
  const { data, error, loading } = useApi(`kalender-agenda:${category}:${from}:${to}:${page}`, () =>
    calendarApi.list({ page, limit: PAGE_LIMIT, category: category || undefined, from, to }),
  );
  const items = data?.items ?? [];

  return (
    <ScrollReveal delay={60}>
      <section aria-labelledby="kalender-agenda-title" className="academic-agenda">
        <div className="academic-agenda-head">
          <h2 id="kalender-agenda-title">Agenda Akademik</h2>
          <p>Jadwal kegiatan akademik resmi Universitas LIA. Pilih kategori, tahun, atau bulan untuk menyaring agenda.</p>
        </div>

        <div className="academic-agenda-filters">
          <div aria-label="Filter kategori agenda" className="academic-agenda-pills" role="tablist">
            {[{ slug: "", name: "Semua" }, ...(categories.data ?? [])].map((item) => {
              const selected = category === item.slug;
              return (
                <button
                  aria-selected={selected}
                  className={`academic-agenda-pill${selected ? " is-active" : ""}`}
                  key={item.slug || "semua"}
                  onClick={() => {
                    setCategory(item.slug);
                    setPage(1);
                  }}
                  role="tab"
                  type="button"
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <div className="academic-agenda-selects">
            <label htmlFor={monthId}>
              <span className="sr-only">Bulan</span>
              <select
                className="academic-agenda-select"
                id={monthId}
                onChange={(event) => {
                  setMonth(Number(event.target.value));
                  setPage(1);
                }}
                value={month}
              >
                <option value={0}>Semua bulan</option>
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={yearId}>
              <span className="sr-only">Tahun</span>
              <select
                className="academic-agenda-select"
                id={yearId}
                onChange={(event) => {
                  setYear(Number(event.target.value));
                  setPage(1);
                }}
                value={year}
              >
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && !data ? (
          <p className="academic-agenda-state" role="alert">
            {errorMessage(error)}
          </p>
        ) : loading && !data ? (
          <p aria-live="polite" className="academic-agenda-state">
            Memuat agenda akademik...
          </p>
        ) : items.length === 0 ? (
          <p className="academic-agenda-state">Tidak ada agenda akademik pada periode ini.</p>
        ) : (
          <ol className="academic-agenda-list">
            {items.map((event) => {
              const { day, month: monthLabel } = dateParts(event.startDate);
              const ongoing = event.startDate <= today && event.endDate >= today;
              return (
                <li className="academic-agenda-item" key={event.id}>
                  <span aria-hidden="true" className="academic-agenda-date">
                    <strong>{day}</strong>
                    <small>{monthLabel}</small>
                  </span>
                  <div className="academic-agenda-copy">
                    <div className="academic-agenda-meta">
                      <span className="academic-agenda-category">{event.category.name}</span>
                      {ongoing && <span className="academic-agenda-ongoing">Sedang berlangsung</span>}
                    </div>
                    <h3>{event.title}</h3>
                    <time className="academic-agenda-range" dateTime={event.startDate}>
                      {dateRange(event)}
                    </time>
                    {event.description && <p>{event.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <Pagination label="Halaman agenda akademik" onChange={setPage} page={page} totalPages={data?.pagination.totalPages ?? 0} />
      </section>
    </ScrollReveal>
  );
}