import { ScrollReveal } from "@/components/scroll-reveal";

export function PerpustakaanLayanan() {
  const layananList = [
    {
      title: "Sirkulasi & Peminjaman Koleksi",
      description: "Peminjaman, pengembalian, dan perpanjangan buku teks serta bahan rujukan akademik dengan sistem terdata.",
    },
    {
      title: "Akses E-Journal & Repositori",
      description: "Penyediaan akses ke artikel ilmiah, publikasi penelitian, skripsi, dan basis data jurnal elektronik berlangganan.",
    },
    {
      title: "Ruang Baca & Belajar Mandiri",
      description: "Fasilitas area baca yang tenang, kondusif, ber-AC, dan dilengkapi jaringan internet Wi-Fi kampus berkecepatan tinggi.",
    },
    {
      title: "Bimbingan Literasi Informasi",
      description: "Bantuan penelusuran referensi, bimbingan sitasi ilmiah, serta asistensi pencarian literatur untuk tugas akhir.",
    },
  ];

  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="upt-layanan-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">SARANA &amp; LAYANAN</span>
          <h2 className="upt-section-title" id="upt-layanan-title">
            Layanan Pendukung Perpustakaan
          </h2>
          <p className="upt-section-desc">
            Berbagai kemudahan dan fasilitas yang disediakan untuk mendukung efektivitas belajar seluruh sivitas akademika Universitas LIA.
          </p>
        </div>

        <div className="upt-layanan-grid">
          {layananList.map((item) => (
            <div className="upt-layanan-card" key={item.title}>
              <div className="upt-layanan-accent" />
              <div className="upt-layanan-body">
                <h3 className="upt-layanan-card-title">{item.title}</h3>
                <p className="upt-layanan-card-desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

