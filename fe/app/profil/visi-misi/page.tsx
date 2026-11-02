import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import {
  KomitmenKami,
  LandasanTujuan,
  VisiMisiHero,
} from "@/components/visi-misi";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Visi & Misi — Universitas LIA",
  description:
    "Arah, tujuan, dan komitmen Universitas LIA dalam penyelenggaraan pendidikan tinggi.",
};

export default function VisiMisiPage() {
  return (
    <main className="visi-misi-page">
      <SiteHeader />

      <div className="visi-misi-content">
        <VisiMisiHero />
        <LandasanTujuan />
        <KomitmenKami />
      </div>

      <SiteFooter className="visi-misi-footer" />

      <a
        aria-label="Hubungi Universitas LIA"
        className="chat-button"
        href="mailto:humas@universitaslia.ac.id"
      >
        <Icon name="message" size={21} />
      </a>
    </main>
  );
}
