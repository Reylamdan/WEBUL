import type { Metadata } from "next";
import {
  BaakaHero,
  BaakaKegiatan,
  BaakaLayanan,
  BaakaTentang,
} from "@/components/unit-dan-bagian";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "BAAKA — Universitas LIA",
  description:
    "Biro Administrasi Akademik, Kemahasiswaan dan Alumni (BAAKA) Universitas LIA menyelenggarakan pelayanan administrasi akademik, kemahasiswaan dan alumni, perencanaan, serta statistik dan informasi.",
};

export default function BaakaPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <BaakaHero />
        <BaakaTentang />
        <BaakaKegiatan />
        <BaakaLayanan />
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

