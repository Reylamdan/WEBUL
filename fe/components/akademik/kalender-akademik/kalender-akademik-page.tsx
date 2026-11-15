import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { KalenderAgenda } from "./kalender-agenda";
import "./kalender-akademik.css";

export function KalenderAkademikPage() {
  return (
    <main className="academic-calendar-page">
      <ScrollReveal>
        <header className="academic-calendar-heading">
          <nav aria-label="Breadcrumb" className="academic-calendar-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">›</span>
            <span>Akademik</span>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Kalender Akademik</span>
          </nav>
          <span className="academic-calendar-eyebrow">AKADEMIK UNIVERSITAS LIA</span>
          <h1>Kalender Akademik</h1>
        </header>
      </ScrollReveal>
      <KalenderAgenda />
    </main>
  );
}