import { ScrollReveal } from "@/components/scroll-reveal";

export function PerpustakaanTugas() {
  const tugasList = [
    {
      number: "01",
      category: "Pendidikan & Pengajaran",
      title: "Menunjang Pendidikan dan Pengajaran",
      description:
        "Dalam menunjang pendidikan dan pengajaran, Perpustakaan Universitas LIA bertujuan untuk mengumpulkan, mengolah, menyimpan, menyajikan, dan menyebarluaskan informasi untuk mahasiswa dan dosen sesuai dengan kurikulum yang berlaku.",
    },
    {
      number: "02",
      category: "Penelitian Ilmiah",
      title: "Menunjang Kegiatan Penelitian",
      description:
        "Dalam menunjang penelitian, kegiatan Perpustakaan Universitas LIA adalah mengumpulkan, mengolah, menyimpan, menyajikan, dan menyebarluaskan informasi bagi peneliti baik di dalam institusi maupun di luar institusi.",
    },
    {
      number: "03",
      category: "Pengabdian Masyarakat",
      title: "Menunjang Pengabdian kepada Masyarakat",
      description:
        "Dalam menunjang pengabdian kepada masyarakat, Perpustakaan Universitas LIA melakukan kegiatan dengan mengumpulkan, mengolah, menyimpan, menyajikan, dan menyebarluaskan informasi bagi masyarakat.",
    },
  ];

  return (
    <ScrollReveal delay={140}>
      <section aria-labelledby="upt-tugas-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TRI DHARMA PERGURUAN TINGGI</span>
          <h2 className="upt-section-title" id="upt-tugas-title">
            Tugas dan Tanggung Jawab
          </h2>
          <p className="upt-section-desc">
            Sebagai bagian dari institusi perguruan tinggi, perpustakaan Universitas LIA diselenggarakan dengan tujuan untuk menunjang pelaksanaan program Perguruan Tinggi sesuai dengan Tri Dharma Perguruan Tinggi, yaitu pendidikan dan pengajaran, penelitian, serta pengabdian kepada masyarakat.
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

