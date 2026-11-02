import Link from "next/link";

export function VisiMisiHero() {
  return (
    <section aria-labelledby="visi-misi-title" className="visi-hero visi-wrap">
      <div className="visi-hero-left">
        <nav aria-label="Breadcrumb" className="visi-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/#tentang">Profil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Visi &amp; Misi</span>
        </nav>

        <h1 className="visi-hero-title" id="visi-misi-title">
          <span className="visi-title-underline">Visi &amp;</span> Misi
        </h1>

        <p className="visi-hero-subtitle">
          Arah, tujuan, dan komitmen Universitas LIA dalam penyelenggaraan pendidikan tinggi.
        </p>
      </div>

      <div className="visi-hero-right">
        <div aria-hidden="true" className="visi-hero-placeholder" />
      </div>
    </section>
  );
}
