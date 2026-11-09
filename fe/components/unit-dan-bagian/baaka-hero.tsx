import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function BaakaHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="baaka-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">BAAKA</span>
          </nav>

          <span className="upt-eyebrow">BIRO ADMINISTRASI AKADEMIK &amp; KEMAHASISWAAN</span>

          <h1 className="upt-hero-title" id="baaka-hero-title">
            <span className="upt-title-underline">BA</span>AKA
          </h1>

          <p className="upt-hero-subtitle">
            Pusat pelayanan administrasi akademik, registrasi mahasiswa, kemahasiswaan, pengelolaan status studi, serta layanan kelulusan dan alumni Universitas LIA.
          </p>
        </div>

        <div className="upt-hero-right">
          <div aria-label="Biro Administrasi Akademik dan Kemahasiswaan LIA" className="upt-placeholder-box" role="img">
            <span className="upt-placeholder-text">Administrasi Akademik, Kemahasiswaan &amp; Alumni — Universitas LIA</span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

