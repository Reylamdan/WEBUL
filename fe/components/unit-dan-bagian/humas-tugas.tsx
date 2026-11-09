import { ScrollReveal } from "@/components/scroll-reveal";

export function HumasTugas() {
  const tugasList = [
    {
      number: "01",
      category: "Promosi & Penerimaan",
      title: "Promotions",
      description:
        "Mempromosikan dan merekrut calon mahasiswa, merencanakan dan melaksanakan pengelolaan sistem administrasi penerimaan mahasiswa baru secara terpadu berbasis teknologi informasi di Universitas LIA.",
    },
    {
      number: "02",
      category: "Sosialisasi Prestasi",
      title: "Socialize",
      description:
        "Mensosialisasikan kegiatan dan prestasi Universitas LIA melalui media massa dan Website Universitas LIA.",
    },
    {
      number: "03",
      category: "Kebijakan & Program",
      title: "Policy",
      description:
        "Mensosialisasikan kebijakan-kebijakan dan program-program Universitas LIA melalui media massa dan Website Universitas LIA kepada masyarakat.",
    },
    {
      number: "04",
      category: "Strategi Kehumasan",
      title: "Strategy and Planning",
      description:
        "Meningkatkan citra Universitas LIA melalui kegiatan-kegiatan kehumasan.",
    },
  ];

  return (
    <ScrollReveal delay={140}>
      <section aria-labelledby="upt-humas-tugas-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TUGAS &amp; FUNGSI</span>
          <h2 className="upt-section-title" id="upt-humas-tugas-title">
            Tugas dan Tanggung Jawab
          </h2>
          <p className="upt-section-desc">
            Unit Pelaksana Teknis Humas dan Marketing memiliki 4 pilar tugas dan tanggung jawab utama:
          </p>
        </div>

        <div className="upt-tugas-cards">
          {tugasList.map((item) => (
            <article className="upt-tugas-card" key={item.number}>
              <div className="upt-tugas-header">
                <span className="upt-tugas-number">{item.number}</span>
                <span className="upt-tugas-category">{item.category}</span>
              </div>
              <h3 className="upt-tugas-card-title">{item.title}</h3>
              <p className="upt-tugas-card-desc">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

