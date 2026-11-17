"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { facilityApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function FasilitasHero() {
  const { data } = useApi("public-facilities", () => facilityApi.get());
  const settings = data?.settings;

  const title = settings?.heroTitle || "Fasilitas Kampus";
  const subtitle =
    settings?.heroSubtitle ||
    "Kenali fasilitas kampus yang mendukung kegiatan belajar, kolaborasi, dan kehidupan mahasiswa.";
  const imageUrl = settings?.heroImageUrl;

  const renderTitle = (text: string) => {
    if (text.startsWith("Fasilitas ")) {
      return (
        <>
          <span className="fasilitas-title-underline">Fas</span>ilitas {text.slice(10)}
        </>
      );
    }
    if (text === "Fasilitas Kampus") {
      return (
        <>
          <span className="fasilitas-title-underline">Fas</span>ilitas Kampus
        </>
      );
    }
    return text;
  };

  return (
    <ScrollReveal>
      <section aria-labelledby="fasilitas-hero-title" className="fasilitas-hero fasilitas-wrap">
        <div className="fasilitas-hero-left">
          <nav aria-label="Breadcrumb" className="fasilitas-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/profil">Profil</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Fasilitas Kampus</span>
          </nav>

          <h1 className="fasilitas-hero-title" id="fasilitas-hero-title">
            {renderTitle(title)}
          </h1>

          <p className="fasilitas-hero-subtitle">{subtitle}</p>
        </div>

        <div className="fasilitas-hero-right">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={title}
              className="fasilitas-hero-img"
              decoding="async"
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <div aria-hidden="true" className="fasilitas-placeholder-box" />
          )}
        </div>
      </section>
    </ScrollReveal>
  );
}
