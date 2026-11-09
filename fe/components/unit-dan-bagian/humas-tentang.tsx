import { ScrollReveal } from "@/components/scroll-reveal";

export function HumasTentang() {
  const highlightFeatures = [
    {
      title: "Promosi & Rekrutmen Mahasiswa",
      description:
        "Merencanakan dan mengelola kampanye promosi terpadu untuk menarik minat calon mahasiswa baru Universitas LIA.",
    },
    {
      title: "Hubungan Media & Publik",
      description:
        "Menjalin komunikasi yang harmonis dengan media massa dan masyarakat demi penyampaian informasi yang akurat dan terpercaya.",
    },
    {
      title: "Pengawalan Citra & Reputasi",
      description:
        "Menjaga serta meningkatkan reputasi positif universitas dan merespons isu-isu strategis secara cepat dan profesional.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="upt-humas-tentang-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TENTANG KAMI</span>
          <h2 className="upt-section-title" id="upt-humas-tentang-title">
            Mengenal UPT Humas dan Marketing
          </h2>
        </div>

        <div className="upt-tentang-card">
          <p className="upt-tentang-lead">
            <strong>Bagian Marketing dan Humas Universitas LIA</strong> bertugas mempromosikan universitas untuk menarik minat calon mahasiswa, serta bertanggung jawab memelihara hubungan baik dengan media dan masyarakat serta menangani isu-isu yang memengaruhi reputasi Universitas LIA.
          </p>
          <p className="upt-tentang-desc">
            Sebagai wajah dan jembatan informasi institusi, UPT Humas dan Marketing mengintegrasikan komunikasi digital, hubungan media, dan program kehumasan untuk memperkuat kehadiran Universitas LIA di kancah pendidikan tinggi nasional maupun global.
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

