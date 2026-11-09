import { ScrollReveal } from "@/components/scroll-reveal";

export function BauskSarpras() {
  const sarprasList = [
    {
      title: "Perpustakaan & Pusat Sumber Belajar",
      category: "Akademik & Literasi",
      description:
        "Fasilitas ruang baca ber-AC, rak koleksi literatur ilmiah, buku teks, jurnal nasional/internasional, dan area belajar mandiri yang nyaman.",
      label: "Fasilitas Literasi",
    },
    {
      title: "Area Parkir & Lingkungan Kampus",
      category: "Kenyamanan & Keamanan",
      description:
        "Kawasan parkir kendaraan roda dua dan roda empat yang luas, teratur, asri dengan pepohonan, serta dilengkapi pos pengamanan 24 jam.",
      label: "Akses & Mobilitas",
    },
    {
      title: "Auditorium & Ruang Pertemuan",
      category: "Pertemuan & Kegiatan",
      description:
        "Aula serbaguna dengan tata suara dan pencahayaan modern untuk penyelenggaraan seminar, kuliah umum, lokakarya, dan kegiatan mahasiswa.",
      label: "Ruang Serbaguna",
    },
  ];

  return (
    <ScrollReveal delay={180}>
      <section aria-labelledby="bausk-sarpras-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">PENGELOLAAN FASILITAS</span>
          <h2 className="upt-section-title" id="bausk-sarpras-title">
            Sarana dan Prasarana Kampus
          </h2>
          <p className="upt-section-desc">
            Sarana dan prasarana penunjang yang dirawat dan dikelola secara berkelanjutan oleh BAUSK untuk mendukung kenyamanan studi serta produktivitas sivitas akademika.
          </p>
        </div>

        <div className="bausk-sarpras-grid">
          {sarprasList.map((item) => (
            <article className="bausk-sarpras-card" key={item.title}>
              <div
                aria-label={`Ilustrasi fasilitas ${item.title}`}
                className="bausk-sarpras-img-box"
                role="img"
              >
                <span className="bausk-sarpras-img-badge">{item.label}</span>
                <span className="upt-placeholder-text" style={{ padding: "0 16px" }}>
                  {item.title}
                </span>
              </div>
              <div className="bausk-sarpras-body">
                <span className="upt-tugas-category" style={{ marginBottom: "6px" }}>
                  {item.category}
                </span>
                <h3 className="bausk-sarpras-title">{item.title}</h3>
                <p className="bausk-sarpras-desc">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

