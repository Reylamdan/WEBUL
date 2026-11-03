import type { Metadata } from "next";
import {
  AkreditasiHero,
  AkreditasiInstitusi,
  AkreditasiProgramStudi,
} from "@/components/akreditasi";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Akreditasi — Universitas LIA",
  description:
    "Informasi akreditasi institusi dan program studi Universitas LIA.",
};

export default function AkreditasiPage() {
  return (
    <main className="akreditasi-page">
      <div className="akreditasi-content">
        <AkreditasiHero />
        <AkreditasiInstitusi />
        <AkreditasiProgramStudi />
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

