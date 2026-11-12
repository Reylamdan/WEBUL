import type { Metadata } from "next";
import {
  BaakaHero,
  BaakaKegiatan,
  BaakaLayanan,
  BaakaTentang,
} from "@/components/unit-dan-bagian";

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

    </main>
  );
}
