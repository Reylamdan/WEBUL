import { ScrollReveal } from "@/components/scroll-reveal";

export function PerpustakaanTentang() {
  const highlightFeatures = [
    {
      title: "Koleksi Ilmiah & Non-Ilmiah",
      description: "Menyediakan buku teks, ensiklopedia, jurnal terindeks, dan artikel akademik maupun wawasan umum.",
    },
    {
      title: "Layanan di Bawah Warek 1",
      description: "Berada langsung di bawah pembinaan Wakil Rektor 1 Bidang Akademik untuk memastikan keselarasan kurikulum.",
    },
    {
      title: "Dukungan Sivitas Akademika",
      description: "Dikelola dan dirawat secara profesional untuk melayani kebutuhan belajar mahasiswa, dosen, serta staf kampus.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
      <section aria-labelledby="upt-tentang-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TENTANG KAMI</span>
          <h2 className="upt-section-title" id="upt-tentang-title">
            Mengenal UPT Perpustakaan
          </h2>
        </div>

        <div className="upt-tentang-card">
          <p className="upt-tentang-lead">
            <strong>Unit Pelaksana Teknis Perpustakaan (UPT Perpustakaan)</strong> adalah unit di bawah Wakil Rektor 1 yang bertugas untuk mengelola dan merawat perpustakaan untuk kebutuhan Mahasiswa, Dosen, dan staf Universitas LIA. UPT Perpustakaan menyediakan buku, artikel baik ilmiah maupun non-ilmiah sebagai pilar utama pusat rujukan literasi kampus.
          </p>
          <p className="upt-tentang-desc">
            Perpustakaan senantiasa berkomitmen mengembangkan fasilitas dan koleksi yang mutakhir, menghadirkan suasana ruang belajar yang inklusif, serta mendukung pemanfaatan teknologi digital guna memudahkan penelusuran informasi bagi seluruh sivitas akademika.
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

