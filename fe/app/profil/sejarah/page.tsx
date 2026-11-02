import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sejarah — Universitas LIA",
  description:
    "Pelajari perjalanan pendidikan dan perkembangan Universitas LIA.",
};

const milestones = [
  {
    title: "Awal perjalanan",
    description:
      "Berangkat dari pengalaman STIA LIA dalam menghadirkan pendidikan tinggi dengan perhatian pada bidang bahasa.",
  },
  {
    title: "Bertumbuh bersama kebutuhan",
    description:
      "Cakupan pembelajaran terus berkembang mengikuti kebutuhan ilmu, keterampilan, dan dunia kerja.",
  },
  {
    title: "Transformasi institusi",
    description:
      "Perjalanan berlanjut melalui transformasi menjadi Universitas LIA dan pengembangan bidang studi.",
  },
  {
    title: "Universitas LIA hari ini",
    description:
      "Menghubungkan bahasa, humaniora, desain, sains, dan bisnis dalam lingkungan belajar yang terus bertumbuh.",
  },
];

export default function HistoryPage() {
  return (
    <main className="history-page">
      <section aria-labelledby="history-title" className="history-hero profile-wrap">
        <div className="history-hero-copy">
          <nav aria-label="Breadcrumb" className="profile-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Sejarah</span>
          </nav>
          <span className="profile-eyebrow">PERJALANAN KAMI</span>
          <h1 id="history-title">Sejarah Universitas LIA</h1>
          <p>
            Perjalanan pendidikan dan perkembangan Universitas LIA dari waktu ke
            waktu.
          </p>
        </div>
        <div aria-hidden="true" className="history-hero-visual">
          <span className="history-visual-line" />
          <span className="history-visual-orbit history-visual-orbit-one" />
          <span className="history-visual-orbit history-visual-orbit-two" />
          <span className="history-visual-label">SEJAK AWAL, TERUS BERTUMBUH</span>
        </div>
      </section>

      <section aria-labelledby="history-journey-title" className="history-journey profile-wrap">
        <div className="profile-section-heading">
          <span className="profile-eyebrow">PERKEMBANGAN INSTITUSI</span>
          <h2 id="history-journey-title">Jejak Perjalanan</h2>
          <p>
            Setiap tahap menjadi bagian dari upaya memperluas kesempatan belajar
            dan menjawab perubahan.
          </p>
        </div>
        <ol className="history-timeline">
          {milestones.map((milestone, index) => (
            <li className="history-milestone" key={milestone.title}>
              <span aria-hidden="true" className="history-milestone-marker">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="history-milestone-card">
                <span className="profile-eyebrow">TAHAP {String(index + 1).padStart(2, "0")}</span>
                <h3>{milestone.title}</h3>
                <p>{milestone.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Tentang Universitas LIA" className="history-callout profile-wrap">
        <div>
          <span className="profile-eyebrow">MELANGKAH KE DEPAN</span>
          <h2>Kenali Universitas LIA lebih dekat</h2>
          <p>
            Temukan bidang studi, nilai, dan kehidupan kampus yang membentuk
            pengalaman belajar di Universitas LIA.
          </p>
        </div>
        <Link className="button button-primary" href="/profil">
          Kembali ke profil <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
