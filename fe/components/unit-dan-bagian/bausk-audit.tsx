import { ScrollReveal } from "@/components/scroll-reveal";

export function BauskAudit() {
  const auditReports = [
    {
      year: "Tahun 2024",
      title: "Laporan Audit Independen 2024",
      opinion: "Wajar Tanpa Pengecualian (WTP)",
      auditor: "Kantor Akuntan Publik (KAP) Independen",
      description: "Hasil evaluasi dan audit menyeluruh atas posisi keuangan, arus kas, dan aktivitas institusi tahun buku 2024.",
    },
    {
      year: "Tahun 2023",
      title: "Laporan Audit Independen 2023",
      opinion: "Wajar Tanpa Pengecualian (WTP)",
      auditor: "Kantor Akuntan Publik (KAP) Independen",
      description: "Laporan auditor independen mengenai kepatuhan akuntansi dan kewajaran pelaporan keuangan tahun buku 2023.",
    },
    {
      year: "Tahun 2022",
      title: "Laporan Audit Independen 2022",
      opinion: "Wajar Tanpa Pengecualian (WTP)",
      auditor: "Kantor Akuntan Publik (KAP) Independen",
      description: "Pemeriksaan laporan keuangan tahunan terverifikasi yang memenuhi standar akuntansi keuangan di Indonesia.",
    },
  ];

  return (
    <ScrollReveal delay={220}>
      <section aria-labelledby="bausk-audit-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TRANSPARANSI &amp; AKUNTABILITAS</span>
          <h2 className="upt-section-title" id="bausk-audit-title">
            Laporan Audit Keuangan
          </h2>
          <p className="upt-section-desc">
            Sebagai wujud komitmen keterbukaan dan kepatuhan tata kelola, laporan keuangan Universitas LIA diaudit secara berkala oleh Kantor Akuntan Publik independen.
          </p>
        </div>

        <div className="bausk-audit-grid">
          {auditReports.map((report) => (
            <article className="bausk-audit-card" key={report.year}>
              {/* Document Cover Motif */}
              <div aria-label={`Sampul ${report.title}`} className="bausk-audit-cover">
                <div aria-hidden="true" className="bausk-audit-cover-ring">
                  <span className="bausk-audit-ring-hole" />
                  <span className="bausk-audit-ring-hole" />
                  <span className="bausk-audit-ring-hole" />
                  <span className="bausk-audit-ring-hole" />
                  <span className="bausk-audit-ring-hole" />
                </div>
                <div className="bausk-audit-cover-label">
                  <span>Laporan Audit Independen</span>
                </div>
              </div>

              <span className="bausk-audit-year-pill">{report.year}</span>
              <h3 className="bausk-audit-title">{report.title}</h3>
              <div className="bausk-audit-opinion">
                <span aria-hidden="true">✓</span>
                <span>Opini: {report.opinion}</span>
              </div>
              <p className="upt-layanan-card-desc" style={{ marginBottom: "14px" }}>
                {report.description}
              </p>

              <div className="bausk-audit-footer">
                <span className="bausk-audit-auditor">{report.auditor}</span>
                <span className="bausk-audit-download-btn">
                  Dokumen Resmi ↗
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

