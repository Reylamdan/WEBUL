import { ScrollReveal } from "@/components/scroll-reveal";

export function BlueprintRoadmap() {
  const roadmapPhases = [
    {
      phase: "Fase 1 (Tahun 1 – 2)",
      title: "Konsolidasi & Integrasi Fondasi",
      description:
        "Fokus pada standardisasi infrastruktur jaringan, peremajaan perangkat keras data center, dan integrasi pangkalan data induk universitas.",
      tags: ["Backbone Fiber Optic", "SSO Terpadu", "Standardisasi SOP TIK", "Audit Keamanan"],
    },
    {
      phase: "Fase 2 (Tahun 3 – 4)",
      title: "Smart Campus & Layanan Mandiri",
      description:
        "Pengembangan platform pembelajaran digital interaktif, portal mobile sivitas akademika, dan otomatisasi administrasi perkuliahan.",
      tags: ["Aplikasi Mobile LIA", "LMS Terpadu", "Paperless Office", "Otomatisasi KRS"],
    },
    {
      phase: "Fase 3 (Tahun 5)",
      title: "Ekosistem Digital Berkelanjutan",
      description:
        "Pemanfaatan analitik data cerdas, kecerdasan buatan untuk personalisasi pembelajaran, dan skalabilitas ekosistem digital kampus.",
      tags: ["AI-Assisted Learning", "Big Data Analytics", "Cloud Scalability", "Smart Classrooms"],
    },
  ];

  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="blueprint-roadmap-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">PETA JALAN TRANSFORMASI</span>
          <h2 className="upt-section-title" id="blueprint-roadmap-title">
            Tahapan Implementasi Roadmap TIK
          </h2>
          <p className="upt-section-desc">
            Rencana tahapan implementasi bertahap untuk memastikan keberlanjutan investasi teknologi dan pencapaian target keunggulan universitas.
          </p>
        </div>

        <div className="blueprint-roadmap-grid">
          {roadmapPhases.map((phase) => (
            <article className="blueprint-roadmap-card" key={phase.phase}>
              <span className="blueprint-roadmap-phase">{phase.phase}</span>
              <h3 className="blueprint-roadmap-title">{phase.title}</h3>
              <p className="blueprint-roadmap-desc">{phase.description}</p>
              <div className="blueprint-roadmap-tags">
                {phase.tags.map((tag, idx) => (
                  <span className="blueprint-roadmap-tag" key={idx}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

