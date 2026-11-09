import type { Metadata } from "next";
import {
  BlueprintDokumen,
  BlueprintHero,
  BlueprintPilar,
  BlueprintRoadmap,
} from "@/components/unit-dan-bagian";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Blueprint TIK — Universitas LIA",
  description:
    "Blueprint Pengembangan Teknologi Informasi dan Komputer Universitas LIA merupakan rencana induk arah kebijakan, arsitektur sistem informasi, dan peta jalan transformasi digital.",
};

export default function BlueprintTikPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <BlueprintHero />
        <BlueprintDokumen />
        <BlueprintPilar />
        <BlueprintRoadmap />
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

