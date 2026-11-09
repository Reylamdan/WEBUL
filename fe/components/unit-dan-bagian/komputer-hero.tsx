import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function KomputerHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="upt-komputer-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">UPT Komputer</span>
          </nav>

          <span className="upt-eyebrow">UNIT PELAKSANA TEKNIS</span>

          <h1 className="upt-hero-title" id="upt-komputer-hero-title">
            <span className="upt-title-underline">UPT</span> Komputer
          </h1>

          <p className="upt-hero-subtitle">
            Pusat perencanaan, pembangunan, serta perawatan infrastruktur Teknologi Informasi dan Komunikasi (TIK) guna mendukung ekosistem digital Universitas LIA.
          </p>
        </div>

        <div className="upt-hero-right">
          <div aria-label="Ilustrasi UPT Komputer dan Infrastruktur TIK" className="upt-placeholder-box" role="img">
            <span className="upt-placeholder-text">Infrastruktur TIK &amp; Jaringan — Universitas LIA</span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

