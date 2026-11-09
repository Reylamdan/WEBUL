import { ScrollReveal } from "@/components/scroll-reveal";

export function KomputerLayanan() {
  const layananList = [
    {
      title: "Jaringan & Konektivitas Kampus",
      description: "Penyediaan dan pemeliharaan koneksi internet broadband, Wi-Fi sivitas akademika, dan jaringan kabel LAN di seluruh gedung kampus.",
    },
    {
      title: "Sistem Informasi Akademik & Portal",
      description: "Pengembangan dan pemeliharaan sistem informasi manajemen terintegrasi untuk perkuliahan, registrasi, KRS, dan portal universitas.",
    },
    {
      title: "Layanan Helpdesk & Dukungan Teknis",
      description: "Dukungan teknis hardware dan software bagi unit kerja, ruang laboratorium komputer, serta dosen dan mahasiswa.",
    },
    {
      title: "Keamanan Siber & Backup Data",
      description: "Penerapan firewall terpadu, pemantauan trafik server, dan pencadangan data berkala demi menjamin integritas informasi institusi.",
    },
  ];

  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="upt-komputer-layanan-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">LAYANAN TEKNOLOGI</span>
          <h2 className="upt-section-title" id="upt-komputer-layanan-title">
            Fokus Layanan TIK Kampus
          </h2>
          <p className="upt-section-desc">
            Berbagai fasilitas dan layanan teknologi informasi yang disediakan untuk menjamin kelancaran aktivitas akademik dan operasional di Universitas LIA.
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

