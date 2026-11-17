"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { profileApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ProfilCard } from "./profil-card";

const DEFAULT_LINKS = [
  {
    id: "default-1",
    title: "Sejarah",
    description: "Perjalanan dan perkembangan institusi.",
    href: "/profil/sejarah",
  },
  {
    id: "default-2",
    title: "Visi & Misi",
    description: "Arah dan komitmen universitas.",
    href: "/profil/visi-misi",
  },
  {
    id: "default-3",
    title: "Struktur Organisasi",
    description: "Susunan organisasi dan tata kelola.",
    href: "/profil/struktur-organisasi",
  },
  {
    id: "default-4",
    title: "Akreditasi",
    description: "Informasi akreditasi institusi dan program studi.",
    href: "/profil/akreditasi",
  },
  {
    id: "default-5",
    title: "Fasilitas Kampus",
    description: "Ruang dan fasilitas pendukung kegiatan kampus.",
    href: "/profil/fasilitas-kampus",
  },
  {
    id: "default-6",
    title: "Unit dan Bagian",
    description: "Unit pelaksana teknis dan bagian tata kelola universitas.",
    href: "/profil/unit-dan-bagian",
  },
];

export function ProfilJelajahi() {
  const { data } = useApi("public-profile", () => profileApi.get());
  const content = data?.content;
  const cards = data?.cards && data.cards.length > 0 ? data.cards : DEFAULT_LINKS;

  const eyebrow = content?.exploreEyebrow || "JELAJAHI PROFIL";
  const title = content?.exploreTitle || "Informasi Universitas LIA";
  const description =
    content?.exploreDescription ||
    "Pilih bagian profil untuk melihat informasi lebih lanjut.";
  const bottomNote =
    content?.bottomNote ||
    "Konten dan foto pendukung dapat ditambahkan setelah materi resmi tersedia.";

  return (
    <ScrollReveal delay={200}>
      <section aria-labelledby="jelajahi-title" className="profile-section profile-wrap" id="informasi">
        <div className="profile-section-header">
          <span className="profile-eyebrow">{eyebrow}</span>
          <h2 className="profile-section-title" id="jelajahi-title">
            {title}
          </h2>
          <p className="profile-section-desc">{description}</p>
        </div>

        <div className="profile-cards-grid">
          {cards.map((item) => (
            <ProfilCard
              description={item.description}
              href={item.href}
              key={item.id ?? item.title}
              title={item.title}
            />
          ))}
        </div>

        <div className="profile-bottom-note">
          <hr className="profile-divider" />
          <p>{bottomNote}</p>
        </div>
      </section>
    </ScrollReveal>
  );
}
