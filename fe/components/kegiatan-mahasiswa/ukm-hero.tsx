"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { ukmApi } from "@/lib/api";

export function UkmHero() {
  const { data } = useApi("public-ukm", () => ukmApi.get());
  const s = data?.settings;

  const eyebrow = s?.heroEyebrow || "ORGANISASI & KOMUNITAS";
  const title = s?.heroTitle || "Kegiatan Mahasiswa (UKM)";
  const subtitle =
    s?.heroSubtitle ||
    "Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas.";
  const badge = s?.heroBadge || "Universitas LIA — Komunitas & UKM";

  return (
    <section aria-labelledby="ukm-hero-title" className="ukm-hero-section">
      <div className="ukm-wrap">
        <nav aria-label="Breadcrumb" className="ukm-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/kehidupan-kampus/kegiatan-mahasiswa">Kehidupan Kampus</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Kegiatan Mahasiswa (UKM)</span>
        </nav>

        <span className="ukm-eyebrow">{eyebrow}</span>

        <h1 className="ukm-hero-title" id="ukm-hero-title">
          {title}
        </h1>

        <p className="ukm-hero-subtitle">{subtitle}</p>

        <div aria-hidden="true" className="ukm-hero-placeholder">
          <div className="ukm-placeholder-inner">
            <span className="ukm-placeholder-badge">{badge}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
