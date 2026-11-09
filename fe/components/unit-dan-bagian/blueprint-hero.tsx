import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function BlueprintHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="blueprint-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian/upt-komputer">UPT Komputer</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Blueprint TIK</span>
          </nav>

          <span className="upt-eyebrow">PERENCANAAN STRATEGIS DIGITAL</span>

          <h1 className="upt-hero-title" id="blueprint-hero-title">
            <span className="upt-title-underline">Blueprint</span> TIK
          </h1>

          <p className="upt-hero-subtitle">
            Rencana induk arah kebijakan, arsitektur sistem informasi, tata kelola keamanan siber, dan peta jalan transformasi digital Universitas LIA.
          </p>
        </div>

        <div className="upt-hero-right">
          <div
            aria-label="Dokumen Blueprint TIK Universitas LIA"
            className="upt-placeholder-box"
            role="img"
          >
            <span className="upt-placeholder-text">
              Master Plan TIK &amp; Arsitektur Sistem — Universitas LIA
            </span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

