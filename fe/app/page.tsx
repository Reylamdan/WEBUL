"use client";

import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { Icon } from "@/components/icons";
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
      <SiteHeader />

      <QuickLinks />
      <HeroSection onPlayVideo={() => setVideoOpen(true)} />
      <AboutSection />
      <ProgramSection />
      <NewsSection />
      <UpdatesSection />
      <CampusLifeSection />
      <AdmissionBanner />
      <PartnersSection />

      <SiteFooter />

      <a
        aria-label="Hubungi Universitas LIA"
        className="chat-button"
        href="mailto:humas@universitaslia.ac.id"
      >
        <Icon name="message" size={21} />
      </a>

      <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </main>
  );
}
