import type { Metadata } from "next";
import {
  BaganOrganisasi,
  StrukturHero,
  UnitPimpinan,
} from "@/components/struktur-organisasi";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Struktur Organisasi — Universitas LIA",
  description: "Susunan organisasi dan tata kelola Universitas LIA.",
};

export default function StrukturOrganisasiPage() {
  return (
    <main className="struktur-page">
      <div className="struktur-content">
        <StrukturHero />
        <BaganOrganisasi />
        <UnitPimpinan />
      </div>

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

