"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { useApi } from "@/lib/use-api";
import { eventDateRange, fetchUpcomingEvents } from "./agenda-data";

export function AgendaPilihan() {
  const { data } = useApi("agenda-upcoming", fetchUpcomingEvents);
  // Agenda terdekat ditampilkan sebagai agenda pilihan. Tanpa data, bagian ini tidak ditampilkan
  // (status kosong/galat ditampilkan oleh bagian "Agenda mendatang").
  const event = data?.items[0];
  if (!event) return null;

  return (
    <ScrollReveal delay={70}>
      <section aria-label="Agenda Pilihan" className="agenda-pilihan-section agenda-wrap">
        <article className="agenda-pilihan-card">
          <div aria-hidden="true" className="agenda-pilihan-image">
            <span className="agenda-placeholder-hint">Foto agenda pilihan</span>
          </div>

          <div className="agenda-pilihan-content">
            <span className="agenda-card-eyebrow">AGENDA PILIHAN</span>
            <h2 className="agenda-pilihan-title">{event.title}</h2>
            {event.description && <p className="agenda-pilihan-desc">{event.description}</p>}
            <div className="agenda-pilihan-meta">
              <span>{[eventDateRange(event), event.category.name].join(" · ")}</span>
            </div>
            <div className="agenda-pilihan-action">
              <button className="agenda-btn-detail" type="button">
                Detail Acara
              </button>
            </div>
          </div>
        </article>
      </section>
    </ScrollReveal>
  );
}
