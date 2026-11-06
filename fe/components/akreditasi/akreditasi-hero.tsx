"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

export function AkreditasiHero() {
  return (
    <section className="section-hero-alt">
      <div className="content-wrap">
        <ScrollReveal>
          <span className="eyebrow">Data Akreditasi</span>
          <h1>Hasil Akreditasi Program Studi</h1>
          <p className="section-lead">
            Berikut adalah daftar program studi Universitas LIA beserta status akreditasi yang telah diperoleh dari Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT).
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
