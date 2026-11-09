import { ScrollReveal } from "@/components/scroll-reveal";

export function HumasLayanan() {
  const layananList = [
    {
      title: "Layanan Informasi PMB & Konsultasi",
      description:
        "Pusat informasi pendaftaran mahasiswa baru, jalur beasiswa, rincian biaya kuliah, dan konsultasi program studi secara tatap muka maupun daring.",
    },
    {
      title: "Publikasi Media & Siaran Pers Resmi",
      description:
        "Penyusunan press release, koordinasi wawancara pimpinan, dan diseminasi berita resmi kegiatan tridharma universitas kepada rekan media.",
    },
    {
      title: "Pengelolaan Media Sosial & Website",
      description:
        "Penyajian konten edukatif, informasi beasiswa, liputan agenda, dan pembaruan berkala di situs resmi serta kanal media sosial Universitas LIA.",
    },
    {
      title: "Kunjungan Sekolah & Edufair Kampus",
      description:
        "Pelaksanaan presentasi kampus ke SMA/SMK mitra, pendampingan pameran pendidikan nasional, dan penyambutan kunjungan sekolah ke kampus.",
    },
  ];

  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="upt-humas-layanan-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">LAYANAN &amp; HUBUNGAN PUBLIK</span>
          <h2 className="upt-section-title" id="upt-humas-layanan-title">
            Layanan Kehumasan &amp; Promosi
          </h2>
          <p className="upt-section-desc">
            Berbagai kanal komunikasi dan layanan informasi yang disediakan UPT Humas dan Marketing untuk calon mahasiswa, civitas akademika, dan masyarakat.
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

