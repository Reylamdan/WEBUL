import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function HumasHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="upt-humas-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">UPT Humas dan Marketing</span>
          </nav>

          <span className="upt-eyebrow">UNIT PELAKSANA TEKNIS</span>

          <h1 className="upt-hero-title" id="upt-humas-hero-title">
            <span className="upt-title-underline">UPT</span> Humas dan Marketing
          </h1>

          <p className="upt-hero-subtitle">
            Pusat komunikasi publik, promosi kelembagaan, serta pengelolaan reputasi dan hubungan kemitraan strategis Universitas LIA.
          </p>
        </div>

        <div className="upt-hero-right">
          <div aria-label="Ilustrasi UPT Humas dan Marketing" className="upt-placeholder-box" role="img">
            <span className="upt-placeholder-text">Komunikasi Publik &amp; Marketing — Universitas LIA</span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

