import { ScrollReveal } from "@/components/scroll-reveal";

export function BlueprintDokumen() {
  const metaItems = [
    { label: "Unit Pengelola", value: "UPT Komputer LIA" },
    { label: "Periode Rencana", value: "2024 – 2028 (5 Tahun)" },
    { label: "Status Dokumen", value: "Disahkan Rektorat" },
    { label: "Klasifikasi", value: "Rencana Induk Strategis" },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="blueprint-dokumen-title" className="upt-section upt-wrap blueprint-doc-section">
        <div className="upt-section-header">
          <span className="upt-eyebrow">DOKUMEN INDUK RESMI</span>
          <h2 className="upt-section-title" id="blueprint-dokumen-title">
            Blueprint Pengembangan Teknologi Informasi dan Komputer
          </h2>
          <p className="upt-section-desc">
            Panduan arsitektur teknologi informasi komprehensif yang menjadi pijakan dalam pembangunan infrastruktur, tata kelola data, dan layanan digital Universitas LIA.
          </p>
        </div>

        <div className="blueprint-doc-grid">
          {/* Left Column: Visual Document Cover */}
          <div className="blueprint-cover-panel">
            <div className="blueprint-cover-box">
              <div aria-hidden="true" className="blueprint-cover-pattern" />
              <div aria-hidden="true" className="blueprint-cover-wave" />

              <div className="blueprint-cover-top">
                <span className="blueprint-cover-brand">UNIVERSITAS LIA</span>
                <span className="blueprint-cover-inst">Unit Pelaksana Teknis Komputer</span>
              </div>

              <div className="blueprint-cover-center">
                <span className="blueprint-cover-badge">MASTER PLAN TIK</span>
                <h3 className="blueprint-cover-title">
                  BLUEPRINT PENGEMBANGAN TEKNOLOGI INFORMASI DAN KOMPUTER
                </h3>
              </div>

              <div className="blueprint-cover-bottom">
                <span className="blueprint-cover-meta">Edisi Pemutakhiran Terpadu</span>
                <span className="blueprint-cover-meta">Smart Campus LIA</span>
              </div>
            </div>

            <div className="blueprint-cover-actions">
              <a
                className="blueprint-btn-download"
                href="#ringkasan-pilar"
                title="Jelajahi Pilar Blueprint"
              >
                <span>Pelajari Pilar Strategis</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* Right Column: Executive Summary & Context */}
          <div className="blueprint-info-panel">
            <div className="blueprint-summary-card">
              <h3 className="blueprint-summary-title">Ringkasan Eksekutif</h3>
              <p className="blueprint-summary-text">
                Blueprint Pengembangan Teknologi Informasi dan Komputer Universitas LIA dirumuskan untuk menjawab kebutuhan era disrupsi digital pendidikan tinggi. Dokumen ini menjadi pedoman terpadu bagi seluruh fakultas, unit kerja, dan pimpinan dalam mengembangkan sistem teknologi yang selaras dengan visi keunggulan Universitas LIA.
              </p>
              <p className="blueprint-summary-text" style={{ marginBottom: "20px" }}>
                Fokus utama mencakup modernisasi infrastruktur jaringan berkecepatan tinggi, integrasi sistem informasi manajemen perguruan tinggi (SIMPT), penguatan sistem keamanan siber terpadu, serta peningkatan literasi teknologi bagi seluruh sivitas akademika.
              </p>

              <div className="blueprint-meta-list">
                {metaItems.map((item) => (
                  <div key={item.label}>
                    <span className="blueprint-meta-item-label">{item.label}</span>
                    <span className="blueprint-meta-item-val">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

