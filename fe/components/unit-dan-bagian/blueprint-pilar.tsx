import { ScrollReveal } from "@/components/scroll-reveal";

export function BlueprintPilar() {
  const pillars = [
    {
      number: "01",
      badge: "SISTEM & INTEGRASI",
      title: "Arsitektur Aplikasi & Layanan Akademik",
      description:
        "Pengembangan dan integrasi sistem informasi manajemen perguruan tinggi (SIMPT) yang mencakup portal mahasiswa, SIAKAD, LMS, admisi PMB, dan repositori riset.",
      initiatives: [
        "Sistem Informasi Akademik (SIAKAD) terpadu berbasis cloud.",
        "Learning Management System (LMS) interaktif untuk perkuliahan hybrid.",
        "Integrasi API terpadu antara keuangan, akademik, dan kepegawaian.",
        "Portal layanan digital satu pintu (Single Sign-On / SSO).",
      ],
    },
    {
      number: "02",
      badge: "JARINGAN & DATA CENTER",
      title: "Infrastruktur & Konektivitas Kampus",
      description:
        "Modernisasi tulang punggung jaringan fiber optic, perluasan hotspot Wi-Fi sivitas akademika, dan penguatan keandalan server data center.",
      initiatives: [
        "Jaringan backbone fiber optic berkapasitas tinggi di seluruh gedung.",
        "Cakupan Wi-Fi kampus berkecepatan tinggi dengan autentikasi aman.",
        "Server virtualisasi mandiri dan Disaster Recovery Center (DRC).",
        "Pemantauan jaringan dan traffic bandwidth 24/7 secara terpusat.",
      ],
    },
    {
      number: "03",
      badge: "KEAMANAN & KEPATUHAN",
      title: "Tata Kelola & Keamanan Informasi",
      description:
        "Penerapan standar tata kelola teknologi informasi dan kerangka kerja keamanan siber untuk melindungi integritas data serta privasi institusi.",
      initiatives: [
        "Penerapan firewall lapis ganda dan sistem pencegahan intrusi (IPS).",
        "Pencadangan data (backup) otomatis secara berkala di lokasi terpisah.",
        "SOP keamanan informasi dan regulasi hak akses data perguruan tinggi.",
        "Kepatuhan audit standar teknologi informasi pendidikan nasional.",
      ],
    },
    {
      number: "04",
      badge: "KAPABILITAS & BUDAYA DIGITAL",
      title: "Pengembangan SDM & Literasi Teknologi",
      description:
        "Penguatan kompetensi digital bagi tenaga kependidikan, dosen, dan tim teknis TI dalam mengoperasikan ekosistem teknologi modern.",
      initiatives: [
        "Pelatihan berkala penggunaan platform digital dan alat kolaborasi.",
        "Peningkatan kapasitas tim helpdesk TI dalam respon kendala pengguna.",
        "Sosialisasi kesadaran keamanan siber (cyber security awareness).",
        "Eksplorasi integrasi kecerdasan buatan (AI) untuk operasional kampus.",
      ],
    },
  ];

  return (
    <ScrollReveal delay={140}>
      <section
        aria-labelledby="blueprint-pilar-title"
        className="upt-section upt-wrap"
        id="ringkasan-pilar"
      >
        <div className="upt-section-header">
          <span className="upt-eyebrow">PONDASI STRATEGIS</span>
          <h2 className="upt-section-title" id="blueprint-pilar-title">
            Empat Pilar Utama Blueprint TIK
          </h2>
          <p className="upt-section-desc">
            Pilar-pilar arsitektur teknologi informasi yang menopang roadmap transformasi digital jangka panjang Universitas LIA:
          </p>
        </div>

        <div className="blueprint-pillars-grid">
          {pillars.map((pillar) => (
            <article className="blueprint-pillar-card" key={pillar.number}>
              <div className="blueprint-pillar-header">
                <span className="blueprint-pillar-num">{pillar.number}</span>
                <span className="blueprint-pillar-badge">{pillar.badge}</span>
              </div>
              <h3 className="blueprint-pillar-title">{pillar.title}</h3>
              <p className="blueprint-pillar-desc">{pillar.description}</p>
              <ul className="blueprint-pillar-items">
                {pillar.initiatives.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

