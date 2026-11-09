import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function BauskHero() {
  return (
    <ScrollReveal>
      <section aria-labelledby="bausk-hero-title" className="upt-hero upt-wrap">
        <div className="upt-hero-left">
          <nav aria-label="Breadcrumb" className="upt-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil/unit-dan-bagian">Unit dan Bagian</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">BAUSK</span>
          </nav>

          <span className="upt-eyebrow">BAGIAN ADMINISTRASI UMUM, SDM &amp; KEUANGAN</span>

          <h1 className="upt-hero-title" id="bausk-hero-title">
            <span className="upt-title-underline">BA</span>USK
          </h1>

          <p className="upt-hero-subtitle">
            Pusat tata kelola sarana prasarana, manajemen aset kampus, akuntansi dan keuangan terpadu, serta pembinaan dan layanan sumber daya manusia Universitas LIA.
          </p>
        </div>

        <div className="upt-hero-right">
          <div
            aria-label="Bagian Administrasi Umum, SDM dan Keuangan LIA"
            className="upt-placeholder-box"
            role="img"
          >
            <span className="upt-placeholder-text">
              Administrasi Umum, SDM &amp; Keuangan — Universitas LIA
            </span>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

