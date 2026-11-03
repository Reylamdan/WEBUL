import Link from "next/link";

export function ProfilHero() {
  return (
    <section aria-labelledby="profile-hero-title" className="profile-hero profile-wrap">
      <div className="profile-hero-left">
        <nav aria-label="Breadcrumb" className="profile-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profil">Profil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Profil</span>
        </nav>

        <h1 className="profile-hero-title" id="profile-hero-title">
          <span className="profile-title-underline">Profil</span> Universitas LIA
        </h1>

        <p className="profile-hero-subtitle">
          Mengenal Universitas LIA, perjalanan institusi, nilai, dan lingkungan akademik yang mendukung pengembangan kompetensi.
        </p>
      </div>

      <div className="profile-hero-right">
        <div aria-hidden="true" className="profile-placeholder-box" />
      </div>
    </section>
  );
}

