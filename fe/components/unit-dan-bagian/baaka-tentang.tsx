import { ScrollReveal } from "@/components/scroll-reveal";

export function BaakaTentang() {
  const highlightFeatures = [
    {
      title: "Administrasi Akademik",
      description:
        "Menyelenggarakan registrasi mahasiswa baru dan lama, kartu ujian, transkrip nilai, cuti akademik, dan administrasi perkuliahan.",
    },
    {
      title: "Kemahasiswaan & Alumni",
      description:
        "Memfasilitasi kegiatan organisasi kemahasiswaan, beasiswa, bimbingan konseling, yudisium, wisuda, dan legalisir dokumen kelulusan.",
    },
    {
      title: "Perencanaan & Pangkalan Data",
      description:
        "Mengelola pelaporan statistik dan informasi PDDikti, administrasi perencanaan, serta integrasi sistem administrasi akademik digital.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="baaka-tentang-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TENTANG KAMI</span>
          <h2 className="upt-section-title" id="baaka-tentang-title">
            Mengenal BAAKA Universitas LIA
          </h2>
        </div>

        <div className="upt-tentang-card">
          <p className="upt-tentang-lead">
            <strong>Administrasi Akademik, Kemahasiswaan dan Alumni (BAAKA)</strong> adalah unsur pelaksana administrasi perguruan tinggi yang menyelenggarakan pelayanan administrasi akademik, kemahasiswaan dan alumni, pelayanan administrasi perencanaan, serta pelayanan administrasi statistik dan informasi.
          </p>
          <p className="upt-tentang-desc">
            Dalam pelaksanaan tugas, BAAKA dipimpin oleh Kepala Bagian dan dibantu oleh beberapa Kepala Sub Bagian (Kasubag). BAAKA berkomitmen memberikan pelayanan prima yang transparan, tepat waktu, dan terintegrasi secara digital guna mendukung kelancaran studi seluruh mahasiswa Universitas LIA.
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

