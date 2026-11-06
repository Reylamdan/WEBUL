"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function ManajemenArsipHero() {
  return (
    <section className="lpm-archive-hero">
      <div className="content-wrap">
        <ScrollReveal>
          <nav aria-label="Breadcrumb" className="lpm-archive-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/lpm">LPM</Link>
            <span aria-hidden="true">/</span>
            <Link href="/lpm/laporan-lpm">Laporan LPM</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Management Arsip</span>
          </nav>
          <span className="lpm-archive-hero-eyebrow">
            LEMBAGA PENJAMINAN MUTU
          </span>
          <h1>Management Arsip</h1>
          <p>
            Telusuri contoh dokumen dan informasi arsip Lembaga Penjaminan Mutu
            Universitas LIA.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
