import { ScrollReveal } from "@/components/scroll-reveal";
import { FasilitasCard } from "./fasilitas-card";

export function FasilitasGallery() {
  const fasilitasItems = [
    {
      title: "Perpustakaan",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
    {
      title: "Ruang Kelas",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
    {
      title: "Laboratorium",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
    {
      title: "Area Kampus",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
    {
      title: "Ruang Kegiatan",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
    {
      title: "Fasilitas Pendukung",
      description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    },
  ];

  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="fasilitas-gallery-title" className="fasilitas-section fasilitas-wrap">
        <div className="fasilitas-section-header">
          <span className="fasilitas-eyebrow">FASILITAS PENDUKUNG</span>
          <h2 className="fasilitas-section-title" id="fasilitas-gallery-title">
            Ruang untuk Belajar dan Berkembang
          </h2>
          <p className="fasilitas-section-desc">
            Galeri fasilitas kampus akan dilengkapi foto dan deskripsi resmi setelah aset tersedia.
          </p>
        </div>

        <div className="fasilitas-cards-grid">
          {fasilitasItems.map((item) => (
            <FasilitasCard
              description={item.description}
              key={item.title}
              title={item.title}
            />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

