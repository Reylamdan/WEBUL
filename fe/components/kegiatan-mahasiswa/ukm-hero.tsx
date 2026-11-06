import Link from "next/link";

export function UkmHero() {
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

        <span className="ukm-eyebrow">ORGANISASI &amp; KOMUNITAS</span>

        <h1 className="ukm-hero-title" id="ukm-hero-title">
          Kegiatan Mahasiswa (UKM)
        </h1>

        <p className="ukm-hero-subtitle">
          Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas.
        </p>

        <div aria-hidden="true" className="ukm-hero-placeholder">
          <div className="ukm-placeholder-inner">
            <span className="ukm-placeholder-badge">Universitas LIA — Komunitas &amp; UKM</span>
          </div>
        </div>
      </div>
    </section>
  );
}

