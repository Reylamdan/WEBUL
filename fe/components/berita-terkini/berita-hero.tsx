import Link from "next/link";

export function BeritaHero() {
  return (
    <section aria-labelledby="berita-hero-title" className="berita-hero berita-wrap">
      <nav aria-label="Breadcrumb" className="berita-breadcrumb">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">/</span>
        <Link href="/kehidupan-kampus/berita-terkini">Kehidupan Kampus</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Berita Terkini</span>
      </nav>

      <span className="berita-eyebrow">KABAR &amp; CERITA UNIVERSITAS</span>

      <h1 className="berita-hero-title" id="berita-hero-title">
        Berita Terkini
      </h1>

      <p className="berita-hero-subtitle">
        Ikuti kabar terbaru, cerita inspiratif, dan berbagai aktivitas dari lingkungan Universitas LIA.
      </p>
    </section>
  );
}

