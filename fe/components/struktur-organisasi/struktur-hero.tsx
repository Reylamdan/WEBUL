import Link from "next/link";

export function StrukturHero() {
  return (
    <section aria-labelledby="struktur-hero-title" className="struktur-hero struktur-wrap">
      <div className="struktur-hero-left">
        <nav aria-label="Breadcrumb" className="struktur-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profil">Profil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Struktur Organisasi</span>
        </nav>

        <h1 className="struktur-hero-title" id="struktur-hero-title">
          <span className="struktur-title-underline">Struktur</span> Organisasi
        </h1>

        <p className="struktur-hero-subtitle">
          Susunan organisasi dan tata kelola Universitas LIA.
        </p>
      </div>

      <div className="struktur-hero-right">
        <div aria-hidden="true" className="struktur-placeholder-box" />
      </div>
    </section>
  );
}

