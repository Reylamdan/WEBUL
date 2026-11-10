import { ScrollReveal } from "@/components/scroll-reveal";

export function AgendaPilihan() {
  return (
    <ScrollReveal delay={70}>
      <section aria-label="Agenda Pilihan" className="agenda-pilihan-section agenda-wrap">
        <article className="agenda-pilihan-card">
          <div aria-hidden="true" className="agenda-pilihan-image">
            <span className="agenda-placeholder-hint">Foto agenda pilihan — isi nanti</span>
          </div>

          <div className="agenda-pilihan-content">
            <span className="agenda-card-eyebrow">AGENDA PILIHAN</span>
            <h2 className="agenda-pilihan-title">
              Temukan kegiatan kampus berikutnya
            </h2>
            <p className="agenda-pilihan-desc">
              Area untuk deskripsi acara, narasumber, waktu pelaksanaan, dan informasi pendaftaran.
            </p>
            <div className="agenda-pilihan-meta">
              <span>Tanggal acara · Waktu · Lokasi</span>
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

