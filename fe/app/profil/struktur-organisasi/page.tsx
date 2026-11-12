import type { Metadata } from "next";
import {
  BaganOrganisasi,
  StrukturHero,
  UnitPimpinan,
} from "@/components/struktur-organisasi";

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

    </main>
  );
}
