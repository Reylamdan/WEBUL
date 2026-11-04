import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Laporan Tahunan Rektor — Universitas LIA",
  description:
    "Arsip laporan tahunan Rektor Universitas LIA yang dipublikasikan setiap tahun.",
};

const reports = [
  {
    year: "2024",
    title: "Laporan Tahunan Rektor 2024",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2024 yang dipublikasikan melalui situs resmi universitas.",
    cover: "/Laporantahunanrektor2024.jpg",
  },
  {
    year: "2025",
    title: "Laporan Tahunan Rektor 2025",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2025 yang dipublikasikan melalui situs resmi universitas.",
    cover: "/Laporantahunanrektor2025.jpg",
  },
];

export default function RectorReportsPage() {
  return (
    <main className="rector-reports-page">
      <section aria-labelledby="rector-reports-title" className="rector-reports-hero">
        <div className="rector-reports-wrap">
          <nav aria-label="Breadcrumb" className="rector-reports-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Laporan Tahunan Rektor</span>
          </nav>
          <h1 id="rector-reports-title">
            Laporan Tahunan Rektor Universitas LIA
          </h1>
          <p>
            Akses dokumen laporan tahunan rektor yang dipublikasikan oleh
            Universitas LIA.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="rector-report-archive-title"
        className="rector-report-archive rector-reports-wrap"
      >
        <div className="rector-report-heading">
          <h2 id="rector-report-archive-title">Arsip laporan</h2>
          <span>{reports.length} dokumen</span>
        </div>
        <div className="rector-report-grid">
          {reports.map((report) => (
            <article className="rector-report-card" key={report.year}>
              <Image
                alt={`Sampul ${report.title}`}
                className="rector-report-cover"
                height={300}
                src={report.cover}
                width={212}
              />
              <div className="rector-report-copy">
                <span className="rector-report-year">TAHUN {report.year}</span>
                <h3>{report.title}</h3>
                <p>{report.description}</p>
                <a
                  className="rector-report-link"
                  href={`mailto:humas@universitaslia.ac.id?subject=${encodeURIComponent(`Permintaan ${report.title}`)}`}
                >
                  Minta Laporan
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
