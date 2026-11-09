import { ScrollReveal } from "@/components/scroll-reveal";

export function BauskTentang() {
  const highlightFeatures = [
    {
      title: "Sarana, Prasarana & Aset",
      description:
        "Melakukan perencanaan pengadaan, inventarisasi aset, pemeliharaan gedung, ruang kuliah, dan fasilitas penunjang kampus.",
    },
    {
      title: "Layanan Kepegawaian & SDM",
      description:
        "Menyelenggarakan administrasi kepegawaian, pembinaan karier, serta program pengembangan kompetensi dosen dan tenaga kependidikan.",
    },
    {
      title: "Keuangan, UKT & Akuntansi",
      description:
        "Mengelola penerimaan UKT, pembiayaan operasional, pembukuan akuntansi, dan penyusunan laporan keuangan terstandardisasi.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="bausk-tentang-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TENTANG KAMI</span>
          <h2 className="upt-section-title" id="bausk-tentang-title">
            Mengenal BAUSK Universitas LIA
          </h2>
        </div>

        <div className="upt-tentang-card">
          <p className="upt-tentang-lead">
            <strong>Bagian Administrasi Umum, Sumber Daya Manusia dan Keuangan (BAUSK)</strong> merupakan unit kerja di bawah Wakil Rektor II bidang Operasional dan Kerjasama Universitas LIA.
          </p>
          <p className="upt-tentang-desc">
            BAUSK bertanggung jawab menjamin kelancaran seluruh operasional universitas melalui pengelolaan sarana prasarana yang andal, pembinaan sumber daya manusia yang profesional dan berintegritas, serta tata kelola keuangan yang transparan, akuntabel, dan berorientasi mutu.
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

