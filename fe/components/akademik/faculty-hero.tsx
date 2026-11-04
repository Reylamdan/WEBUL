import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function FacultyHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="faculty-title" className="faculty-intro faculty-wrap">
        <div className="faculty-intro-copy">
          <nav aria-label="Breadcrumb" className="faculty-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span>Akademik</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Fakultas</span>
          </nav>
          <span className="faculty-eyebrow">PENDIDIKAN UNIVERSITAS LIA</span>
          <h1 id="faculty-title">Fakultas</h1>
          <p>
            Jelajahi fakultas dan program studi Universitas LIA, lengkap dengan
            bidang fokus, program akademik, dan akses informasi resmi.
          </p>
        </div>
        <div aria-hidden="true" className="faculty-intro-visual">
          <span className="faculty-intro-orbit" />
          <span className="faculty-intro-visual-label">TEMUKAN BIDANGMU</span>
        </div>
      </section>
    </ScrollReveal>
  );
}
