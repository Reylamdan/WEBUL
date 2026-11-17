"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { profileApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function ProfilHero() {
  const { data } = useApi("public-profile", () => profileApi.get());
  const content = data?.content;

  const title = content?.heroTitle || "Profil Universitas LIA";
  const subtitle =
    content?.heroSubtitle ||
    "Mengenal Universitas LIA, perjalanan institusi, nilai, dan lingkungan akademik yang mendukung pengembangan kompetensi.";
  const imageUrl = content?.heroImageUrl;

  const renderTitle = (text: string) => {
    if (text.startsWith("Profil ")) {
      return (
        <>
          <span className="profile-title-underline">Profil</span> {text.slice(7)}
        </>
      );
    }
    return text;
  };

  return (
    <ScrollReveal>
      <section aria-labelledby="profile-hero-title" className="profile-hero profile-wrap">
        <div className="profile-hero-left">
          <nav aria-label="Breadcrumb" className="profile-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Profil</span>
          </nav>

          <h1 className="profile-hero-title" id="profile-hero-title">
            {renderTitle(title)}
          </h1>

          <p className="profile-hero-subtitle">{subtitle}</p>
        </div>

        <div className="profile-hero-right">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={title}
              className="profile-media-image"
              decoding="async"
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <div aria-hidden="true" className="profile-placeholder-box" />
          )}
        </div>
      </section>
    </ScrollReveal>
  );
}
