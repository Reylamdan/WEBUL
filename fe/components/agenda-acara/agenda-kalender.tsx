import { ScrollReveal } from "@/components/scroll-reveal";

export function AgendaKalender() {
  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="agenda-kalender-title" className="agenda-section agenda-wrap agenda-kalender-section">
        <div className="agenda-section-header">
          <h2 className="agenda-section-title" id="agenda-kalender-title">
            Kalender kegiatan
          </h2>
          <p className="agenda-section-desc">
            Tampilan kalender dapat diisi setelah jadwal kegiatan resmi tersedia.
          </p>
        </div>

        <div className="agenda-kalender-box">
          <h3 className="agenda-kalender-box-title">Kalender acara</h3>
          <p className="agenda-kalender-box-desc">
            Area untuk kalender bulanan, tanggal kegiatan, dan tautan menuju detail acara.
          </p>
        </div>
      </section>
    </ScrollReveal>
  );
}

