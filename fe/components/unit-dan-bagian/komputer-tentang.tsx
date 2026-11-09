import { ScrollReveal } from "@/components/scroll-reveal";

export function KomputerTentang() {
  const highlightFeatures = [
    {
      title: "Perencanaan & Pembangunan",
      description: "Merancang arsitektur jaringan, server, dan sistem informasi manajemen perguruan tinggi secara berkelanjutan.",
    },
    {
      title: "Perawatan Infrastruktur TIK",
      description: "Menjaga keandalan perangkat keras, jaringan internet kampus, data center, dan sistem database utama.",
    },
    {
      title: "Keamanan & Dukungan Layanan",
      description: "Mengembangkan keamanan siber terpadu serta memberikan dukungan teknis komputasi bagi seluruh sivitas akademika.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="upt-komputer-tentang-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TENTANG KAMI</span>
          <h2 className="upt-section-title" id="upt-komputer-tentang-title">
            Mengenal UPT Komputer
          </h2>
        </div>

        <div className="upt-tentang-card">
          <p className="upt-tentang-lead">
            <strong>Unit Pelaksana Teknis (UPT) Komputer</strong> merupakan salah satu unit strategis dalam Universitas LIA dengan fungsi dan tanggung jawab utama melakukan perencanaan, pembangunan, serta perawatan infrastruktur Teknologi Informasi dan Komunikasi (TIK).
          </p>
          <p className="upt-tentang-desc">
            UPT Komputer memastikan seluruh operasional universitas—mulai dari proses belajar mengajar, administrasi akademik, hingga riset dan layanan publik—didukung oleh teknologi yang stabil, aman, dan mutakhir.
          </p>

          <div className="upt-badges-grid">
            {highlightFeatures.map((item) => (
              <div className="upt-badge-card" key={item.title}>
                <h3 className="upt-badge-title">{item.title}</h3>
                <p className="upt-badge-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

