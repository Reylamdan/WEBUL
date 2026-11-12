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

export default function Home() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <main>
      <QuickLinks />
      <HeroSection onPlayVideo={() => setVideoOpen(true)} />
      <AboutSection />
      <ProgramSection />
      <NewsSection />
      <UpdatesSection />
      <CampusLifeSection />
      <AdmissionBanner />
      <PartnersSection />

      <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </main>
  );
}
