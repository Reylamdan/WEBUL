import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  rectorReportPublicApi,
  type RectorReportItem,
  type RectorReportSettings,
} from "@/lib/rector-report-admin-api";

export const metadata: Metadata = {
  title: "Laporan Tahunan Rektor — Universitas LIA",
  description:
    "Arsip laporan tahunan Rektor Universitas LIA yang dipublikasikan setiap tahun.",
};

const defaultSettings: RectorReportSettings = {
  id: "main",
  heroTitle: "Laporan Tahunan Rektor Universitas LIA",
  heroDescription:
    "Akses dokumen laporan tahunan rektor yang dipublikasikan oleh Universitas LIA.",
  archiveTitle: "Arsip laporan",
  contactEmail: "humas@universitaslia.ac.id",
};

const defaultReports: RectorReportItem[] = [
  {
    id: "default-rector-report-2024",
    year: 2024,
    title: "Laporan Tahunan Rektor 2024",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2024 yang dipublikasikan melalui situs resmi universitas.",
    coverUrl: "/Laporantahunanrektor2024.jpg",
    fileUrl: null,
    contactEmail: null,
    sortOrder: 1,
  },
  {
    id: "default-rector-report-2025",
    year: 2025,
    title: "Laporan Tahunan Rektor 2025",
    description:
      "Dokumen laporan tahunan Rektor Universitas LIA tahun 2025 yang dipublikasikan melalui situs resmi universitas.",
    coverUrl: "/Laporantahunanrektor2025.jpg",
    fileUrl: null,
    contactEmail: null,
    sortOrder: 2,
  },
];

async function getRectorReportsData() {
  try {
    return await rectorReportPublicApi.getPublicData();
  } catch {
    return {
      settings: defaultSettings,
      reports: defaultReports,
    };
  }
}

export default async function RectorReportsPage() {
  const data = await getRectorReportsData();
  const settings = data?.settings || defaultSettings;
  const reports =
    data?.reports && data.reports.length > 0 ? data.reports : defaultReports;

  return (
    <main className="rector-reports-page">
      <ScrollReveal>
        <section aria-labelledby="rector-reports-title" className="rector-reports-hero">
          <div className="rector-reports-wrap">
            <nav aria-label="Breadcrumb" className="rector-reports-breadcrumb">
              <Link href="/">Beranda</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page">Laporan Tahunan Rektor</span>
            </nav>
            <h1 id="rector-reports-title">{settings.heroTitle}</h1>
            <p>{settings.heroDescription}</p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <section
          aria-labelledby="rector-report-archive-title"
          className="rector-report-archive rector-reports-wrap"
        >
          <div className="rector-report-heading">
            <h2 id="rector-report-archive-title">{settings.archiveTitle || "Arsip laporan"}</h2>
            <span>{reports.length} dokumen</span>
          </div>
          <div className="rector-report-grid">
            {reports.map((report) => (
              <article className="rector-report-card" key={report.id || report.year}>
                <Image
                  alt={`Sampul ${report.title}`}
                  className="rector-report-cover"
                  height={300}
                  src={report.coverUrl || "/Laporantahunanrektor2024.jpg"}
                  width={212}
                />
                <div className="rector-report-copy">
                  <span className="rector-report-year">TAHUN {report.year}</span>
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                  <a
                    className="rector-report-link"
                    href={
                      report.fileUrl
                        ? report.fileUrl
                        : `mailto:${report.contactEmail || settings.contactEmail}?subject=${encodeURIComponent(
                            `Permintaan ${report.title}`
                          )}`
                    }
                    {...(report.fileUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {report.fileUrl ? "Buka Laporan" : "Minta Laporan"}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
