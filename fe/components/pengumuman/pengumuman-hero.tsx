import Link from "next/link";

export function PengumumanHero() {
  return (
    <section aria-labelledby="pengumuman-hero-title" className="pengumuman-hero-section">
      <div className="pengumuman-wrap">
        <nav aria-label="Breadcrumb" className="pengumuman-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">/</span>
          <Link href="/kehidupan-kampus/pengumuman">Kehidupan Kampus</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Pengumuman</span>
        </nav>

        <span className="pengumuman-eyebrow">INFORMASI RESMI</span>

        <h1 className="pengumuman-hero-title" id="pengumuman-hero-title">
          Pengumuman
        </h1>

        <p className="pengumuman-hero-subtitle">
          Pusat informasi untuk pengumuman akademik, administrasi, dan pemberitahuan penting bagi sivitas akademika.
        </p>

        <div className="pengumuman-notice-box">
          <span className="pengumuman-notice-tag">PUSAT INFORMASI RESMI</span>
          <p className="pengumuman-notice-text">
            Pengumuman akan ditampilkan setelah informasi dan tanggalnya dikonfirmasi oleh pihak universitas.
          </p>
        </div>
      </div>
    </section>
  );
}

