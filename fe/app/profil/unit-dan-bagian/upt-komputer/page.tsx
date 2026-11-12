import type { Metadata } from "next";
import {
  KomputerHero,
  KomputerLayanan,
  KomputerTentang,
  KomputerTugas,
} from "@/components/unit-dan-bagian";

export const metadata: Metadata = {
  title: "UPT Komputer — Universitas LIA",
  description:
    "Unit Pelaksana Teknis Komputer Universitas LIA bertugas melakukan perencanaan, pembangunan, serta perawatan infrastruktur TIK dan Sistem Informasi Manajemen Perguruan Tinggi (SIMPT).",
};

export default function UptKomputerPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <KomputerHero />
        <KomputerTentang />
        <KomputerTugas />
        <KomputerLayanan />
      </div>

    </main>
  );
}
