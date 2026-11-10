import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function AgendaHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="agenda-hero-title" className="agenda-hero agenda-wrap">
        <nav aria-label="Breadcrumb" className="agenda-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/kehidupan-kampus/berita-terkini">Kehidupan Kampus</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Agenda Acara</span>
        </nav>

        <span className="agenda-eyebrow">KALENDER KEGIATAN</span>

        <h1 className="agenda-hero-title" id="agenda-hero-title">
          Agenda Acara
        </h1>

        <p className="agenda-hero-subtitle">
          Lihat rencana kegiatan, acara kampus, seminar, dan aktivitas lain yang akan berlangsung di Universitas LIA.
        </p>
      </section>
    </ScrollReveal>
  );
}

