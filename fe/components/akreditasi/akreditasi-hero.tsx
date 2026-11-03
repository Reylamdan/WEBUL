import Link from "next/link";

export function AkreditasiHero() {
  return (
    <section aria-labelledby="akreditasi-hero-title" className="akreditasi-hero akreditasi-wrap">
      <div className="akreditasi-hero-left">
        <nav aria-label="Breadcrumb" className="akreditasi-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profil">Profil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Akreditasi</span>
        </nav>

        <h1 className="akreditasi-hero-title" id="akreditasi-hero-title">
          <span className="akreditasi-title-underline">Akre</span>ditasi
        </h1>

        <p className="akreditasi-hero-subtitle">
          Informasi akreditasi institusi dan program studi Universitas LIA.
        </p>
      </div>

      <div className="akreditasi-hero-right">
        <div aria-hidden="true" className="akreditasi-placeholder-box" />
      </div>
    </section>
  );
}

