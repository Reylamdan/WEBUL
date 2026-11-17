"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { facilityApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { FasilitasCard } from "./fasilitas-card";

const DEFAULT_ITEMS = [
  {
    id: "default-1",
    title: "Perpustakaan",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
  {
    id: "default-2",
    title: "Ruang Kelas",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
  {
    id: "default-3",
    title: "Laboratorium",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
  {
    id: "default-4",
    title: "Area Kampus",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
  {
    id: "default-5",
    title: "Ruang Kegiatan",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
  {
    id: "default-6",
    title: "Fasilitas Pendukung",
    description: "Foto dan deskripsi fasilitas akan ditambahkan.",
    imageUrl: null,
  },
];

export function FasilitasGallery() {
  const { data } = useApi("public-facilities", () => facilityApi.get());
  const settings = data?.settings;
  const items = data?.items && data.items.length > 0 ? data.items : DEFAULT_ITEMS;

  const eyebrow = settings?.galleryEyebrow || "FASILITAS PENDUKUNG";
  const title = settings?.galleryTitle || "Ruang untuk Belajar dan Berkembang";
  const description =
    settings?.galleryDescription ||
    "Galeri fasilitas kampus akan dilengkapi foto dan deskripsi resmi setelah aset tersedia.";

  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="fasilitas-gallery-title" className="fasilitas-section fasilitas-wrap">
        <div className="fasilitas-section-header">
          <span className="fasilitas-eyebrow">{eyebrow}</span>
          <h2 className="fasilitas-section-title" id="fasilitas-gallery-title">
            {title}
          </h2>
          <p className="fasilitas-section-desc">{description}</p>
        </div>

        <div className="fasilitas-cards-grid">
          {items.map((item) => (
            <FasilitasCard
              description={item.description}
              imageUrl={item.imageUrl}
              key={item.id ?? item.title}
              title={item.title}
            />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
