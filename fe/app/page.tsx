"use client";

import { useState } from "react";

import {
  AboutSection,
  AdmissionBanner,
  CampusLifeSection,
  HeroSection,
  NewsSection,
  PartnersSection,
  ProgramSection,
  QuickLinks,
  UpdatesSection,
  VideoModal,
} from "@/components/landing";
import { DEFAULT_HOMEPAGE_CONTENT, homepageApi } from "@/lib/homepage-api";
import { useApi } from "@/lib/use-api";

export default function Home() {
  const [videoOpen, setVideoOpen] = useState(false);

  // Teks, foto, dan video beranda dikelola admin. Selama memuat atau jika API gagal,
  // teks bawaan dipakai agar beranda tidak kosong. Berita/pengumuman/agenda punya API sendiri.
  const { data } = useApi("homepage", () => homepageApi.get());
  const content = data?.content ?? DEFAULT_HOMEPAGE_CONTENT;

  return (
    <main>
      <QuickLinks items={content.quickLinks} />
      <HeroSection
        content={content.hero}
        onPlayVideo={() => setVideoOpen(true)}
        photoUrl={data?.photos.hero[0]?.imageUrl}
      />
      <AboutSection content={content.about} photoUrl={data?.photos.about[0]?.imageUrl} />
      <ProgramSection content={content.programs} />
      <NewsSection />
      <UpdatesSection />
      <CampusLifeSection
        content={content.campusLife}
        photoUrl={data?.photos.campusLife[0]?.imageUrl}
      />
      <AdmissionBanner content={content.admission} />
      <PartnersSection partners={content.partners.items} title={content.partners.title} />

      <VideoModal
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videos={data?.videos ?? []}
      />
    </main>
  );
}
