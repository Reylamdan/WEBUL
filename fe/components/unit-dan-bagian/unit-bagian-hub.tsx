import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function UnitBagianHub() {
  const unitList = [
    {
      category: "UPT",
      title: "UPT Perpustakaan",
      description: "Pengelolaan dan penyediaan literatur ilmiah, buku teks, dan sarana Tri Dharma Perguruan Tinggi.",
      href: "/profil/unit-dan-bagian/upt-perpustakaan",
      isReady: true,
    },
    {
      category: "UPT",
      title: "UPT Komputer",
      description: "Pusat layanan teknologi informasi, infrastruktur jaringan kampus, serta Blueprint TIK Universitas LIA.",
      href: "/profil/unit-dan-bagian/upt-komputer",
      isReady: true,
    },
    {
      category: "UPT",
      title: "UPT Humas dan Marketing",
      description: "Pengelolaan komunikasi publik, publikasi institusi, dan promosi kelembagaan universitas.",
      href: "/profil/unit-dan-bagian/upt-humas-marketing",
      isReady: true,
    },
    {
      category: "BIRO",
      title: "BAAKA",
      description: "Biro Administrasi Akademik dan Kemahasiswaan yang melayani kebutuhan operasional studi mahasiswa.",
      href: "/profil/unit-dan-bagian/baaka",
      isReady: true,
    },
    {
      category: "BIRO",
      title: "BAUSK",
      description: "Biro Administrasi Umum dan Sumber Daya / Keuangan yang mengelola sarana prasarana dan ketatausahaan.",
      href: "/profil/unit-dan-bagian/bausk",
      isReady: true,
    },
    {
      category: "DOKUMEN",
      title: "Peraturan Universitas",
      description: "Kumpulan ketetapan, statuta, pedoman akademik, dan regulasi internal tata kelola institusi.",
      href: "/profil/unit-dan-bagian/peraturan",
      isReady: false,
    },
  ];

  return (
    <>
      <ScrollReveal>
        <section aria-labelledby="hub-hero-title" className="upt-hero upt-wrap">
          <div className="upt-hero-left">
            <nav aria-label="Breadcrumb" className="upt-breadcrumb">
              <Link href="/">Beranda</Link>
              <span aria-hidden="true">/</span>
              <Link href="/profil">Profil</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Unit dan Bagian</span>
            </nav>

            <span className="upt-eyebrow">TATA KELOLA KAMPUS</span>

            <h1 className="upt-hero-title" id="hub-hero-title">
              <span className="upt-title-underline">Unit</span> dan Bagian
            </h1>

            <p className="upt-hero-subtitle">
              Struktur unit pelaksana teknis dan biro administrasi yang menjalankan tata kelola serta pelayanan akademik dan operasional di Universitas LIA.
            </p>
          </div>

          <div className="upt-hero-right">
            <div aria-label="Unit dan Bagian Universitas LIA" className="upt-placeholder-box" role="img">
              <span className="upt-placeholder-text">Unit &amp; Bagian Tata Kelola — Universitas LIA</span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <section aria-labelledby="hub-grid-title" className="upt-section upt-wrap">
          <div className="upt-section-header">
            <span className="upt-eyebrow">DAFTAR UNIT</span>
            <h2 className="upt-section-title" id="hub-grid-title">
              Jelajahi Unit dan Bagian
            </h2>
            <p className="upt-section-desc">
              Pilih unit atau bagian untuk membaca rincian tugas, fungsi, dan layanan pendukung yang tersedia.
            </p>
          </div>

          <div className="unit-hub-grid">
            {unitList.map((item) => (
              <Link className="unit-hub-card-link" href={item.href} key={item.title}>
                <article className="unit-hub-card">
                  <div className="unit-hub-card-top">
                    <span className="unit-hub-card-category">{item.category}</span>
                    <span aria-hidden="true" className="unit-hub-card-arrow">↗</span>
                  </div>
                  <h3 className="unit-hub-card-title">{item.title}</h3>
                  <p className="unit-hub-card-desc">{item.description}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}

