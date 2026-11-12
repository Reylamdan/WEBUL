import type { Metadata } from "next";
import {
  KomitmenKami,
  LandasanTujuan,
  VisiMisiHero,
} from "@/components/visi-misi";

export const metadata: Metadata = {
  title: "Visi & Misi — Universitas LIA",
  description:
    "Arah, tujuan, dan komitmen Universitas LIA dalam penyelenggaraan pendidikan tinggi.",
};

export default function VisiMisiPage() {
  return (
    <main className="visi-misi-page">
      <div className="visi-misi-content">
        <VisiMisiHero />
        <LandasanTujuan />
        <KomitmenKami />
      </div>
    </main>
  );
}
