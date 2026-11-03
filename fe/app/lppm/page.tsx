import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "LPPM — Universitas LIA",
  description:
    "Lembaga Penelitian dan Pengabdian kepada Masyarakat Universitas LIA.",
};

const focusAreas = [
  {
    number: "01",
    title: "Penelitian dan inovasi",
    description:
      "Mendorong kegiatan riset yang kreatif, produktif, dan relevan dengan perkembangan ilmu serta kebutuhan masyarakat.",
  },
  {
    number: "02",
    title: "Pengabdian kepada masyarakat",
    description:
      "Menghubungkan pengetahuan dan keahlian akademik dengan kegiatan yang memberi manfaat bagi masyarakat.",
  },
  {
    number: "03",
    title: "Publikasi dan diseminasi",
    description:
      "Mendukung penyebarluasan hasil penelitian dan gagasan akademik melalui publikasi ilmiah.",
  },
  {
    number: "04",
    title: "Kolaborasi akademik",
    description:
      "Membuka ruang kerja sama lintas bidang untuk memperkuat riset dan pengabdian yang berdampak.",
  },
];

const workSteps = [
  {
    title: "Perencanaan",
    description:
      "Merumuskan topik dan tujuan kegiatan berdasarkan kebutuhan serta keahlian yang tersedia.",
  },
  {
    title: "Pelaksanaan dan kolaborasi",
    description:
      "Mengembangkan kegiatan penelitian dan pengabdian bersama sivitas akademika dan mitra.",
  },
  {
    title: "Publikasi dan berbagi hasil",
    description:
      "Mendorong dokumentasi dan diseminasi hasil agar pengetahuan dapat dimanfaatkan lebih luas.",
  },
];

export default function LppmPage() {
  return (
    <main className="lppm-page">
      <ScrollReveal>
        <section aria-labelledby="lppm-title" className="lppm-hero" id="profil">
          <div className="lppm-wrap lppm-hero-inner">
            <div className="lppm-hero-copy">
              <nav aria-label="Breadcrumb" className="profile-breadcrumb">
                <Link href="/">Beranda</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">LPPM</span>
              </nav>
              <span className="lppm-eyebrow">LEMBAGA PENELITIAN DAN PENGABDIAN</span>
              <h1 id="lppm-title">
                Riset dan pengabdian
                <br />
                untuk dampak yang nyata.
              </h1>
              <p>
                LPPM Universitas LIA mendorong kegiatan penelitian dan
                pengabdian yang menghubungkan pengetahuan, kolaborasi, dan
                kebutuhan masyarakat.
              </p>
              <div className="lppm-hero-actions">
                <Link className="lppm-button lppm-button-light" href="#penelitian">
                  Jelajahi kegiatan <span aria-hidden="true">↓</span>
                </Link>
                <Link className="lppm-text-link" href="#publikasi">
                  Publikasi ilmiah <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
            <div aria-hidden="true" className="lppm-hero-art">
              <div className="lppm-art-card lppm-art-card-research">
                <span className="lppm-art-icon">01</span>
                <span>Riset</span>
              </div>
              <div className="lppm-art-card lppm-art-card-service">
                <span className="lppm-art-icon">02</span>
                <span>Pengabdian</span>
              </div>
              <span className="lppm-art-orbit lppm-art-orbit-one" />
              <span className="lppm-art-orbit lppm-art-orbit-two" />
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={70}>
        <section
          aria-labelledby="lppm-intro-title"
          className="lppm-intro lppm-wrap"
        >
          <div>
            <span className="lppm-eyebrow">TENTANG LPPM</span>
            <h2 id="lppm-intro-title">
              Riset kreatif, produktif, dan berdampak bagi masyarakat
            </h2>
          </div>
          <p>
            Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM)
            Universitas LIA menjadi ruang untuk mengembangkan kegiatan
            akademik, berbagi pengetahuan, dan membangun kolaborasi yang
            bermanfaat. Riset dan pengabdian mendorong ilmu untuk tumbuh
            bersama kebutuhan masyarakat.
          </p>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <section
          aria-labelledby="lppm-focus-title"
          className="lppm-focus lppm-wrap"
        >
          <div className="lppm-section-heading">
            <span className="lppm-eyebrow">KENALI LPPM UNIVERSITAS LIA</span>
            <h2 id="lppm-focus-title">Ruang untuk berkarya dan berbagi</h2>
          </div>
          <div className="lppm-focus-grid">
            {focusAreas.map((area) => (
              <article className="lppm-focus-card" key={area.number}>
                <span className="lppm-card-number">{area.number}</span>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section
          aria-label="Komitmen LPPM"
          className="lppm-statement"
          id="pengabdian"
        >
          <div className="lppm-wrap lppm-statement-inner">
            <p>
              Menjadikan riset dan pengabdian sebagai jembatan pengetahuan,
              kolaborasi, dan dampak positif bagi masyarakat.
            </p>
            <div>
              <span className="lppm-eyebrow">LPPM UNIVERSITAS LIA</span>
              <p>
                Bersama sivitas akademika dan mitra, gagasan dikembangkan
                menjadi kegiatan yang relevan dan bermakna.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={70}>
        <section
          aria-labelledby="lppm-work-title"
          className="lppm-work lppm-wrap"
          id="penelitian"
        >
          <div className="lppm-section-heading">
            <span className="lppm-eyebrow">DARI GAGASAN MENJADI DAMPAK</span>
            <h2 id="lppm-work-title">
              Mengelola penelitian dan pengabdian secara terarah
            </h2>
          </div>
          <ol className="lppm-work-list">
            {workSteps.map((step, index) => (
              <li className="lppm-work-item" key={step.title}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <section
          aria-labelledby="lppm-publication-title"
          className="lppm-publication lppm-wrap"
          id="publikasi"
        >
          <div>
            <span className="lppm-eyebrow">PUBLIKASI ILMIAH UNIVERSITAS LIA</span>
            <h2 id="lppm-publication-title">
              Berbagi pengetahuan, memperluas dampak
            </h2>
            <p>
              Informasi jurnal, publikasi, dan hasil penelitian akan
              ditampilkan setelah kanal publikasi resmi tersedia.
            </p>
          </div>
          <a
            className="lppm-button lppm-button-dark"
            href="mailto:humas@universitaslia.ac.id?subject=Informasi%20LPPM"
          >
            Hubungi Universitas LIA <span aria-hidden="true">↗</span>
          </a>
        </section>
      </ScrollReveal>
    </main>
  );
}
