import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function PerpustakaanHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="upt-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">UPT Perpustakaan</span>
          </nav>

          <span className="upt-eyebrow">UNIT PELAKSANA TEKNIS</span>

          <h1 className="upt-hero-title" id="upt-hero-title">
            <span className="upt-title-underline">UPT</span> Perpustakaan
          </h1>

          <p className="upt-hero-subtitle">
            Unit Pelaksana Teknis Perpustakaan Universitas LIA mengelola dan menyediakan sumber daya informasi, literatur ilmiah, serta sarana belajar guna menunjang Tri Dharma Perguruan Tinggi.
          </p>
        </div>

        <div className="upt-hero-right">
          <div aria-label="Ilustrasi Perpustakaan Universitas LIA" className="upt-placeholder-box" role="img">
            <span className="upt-placeholder-text">UPT Perpustakaan — Universitas LIA</span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

