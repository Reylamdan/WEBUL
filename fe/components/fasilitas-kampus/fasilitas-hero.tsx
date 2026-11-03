import Link from "next/link";

export function FasilitasHero() {
  return (
    <section aria-labelledby="fasilitas-hero-title" className="fasilitas-hero fasilitas-wrap">
      <div className="fasilitas-hero-left">
        <nav aria-label="Breadcrumb" className="fasilitas-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profil">Profil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Fasilitas Kampus</span>
        </nav>

        <h1 className="fasilitas-hero-title" id="fasilitas-hero-title">
          <span className="fasilitas-title-underline">Fas</span>ilitas Kampus
        </h1>

        <p className="fasilitas-hero-subtitle">
          Kenali fasilitas kampus yang mendukung kegiatan belajar, kolaborasi, dan kehidupan mahasiswa.
        </p>
      </div>

      <div className="fasilitas-hero-right">
        <div aria-hidden="true" className="fasilitas-placeholder-box" />
      </div>
    </section>
  );
}

