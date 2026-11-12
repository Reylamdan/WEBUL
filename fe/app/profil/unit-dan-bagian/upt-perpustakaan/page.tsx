import type { Metadata } from "next";
import {
  PerpustakaanHero,
  PerpustakaanLayanan,
  PerpustakaanTentang,
  PerpustakaanTugas,
} from "@/components/unit-dan-bagian";

export const metadata: Metadata = {
  title: "UPT Perpustakaan — Universitas LIA",
  description:
    "Unit Pelaksana Teknis Perpustakaan Universitas LIA mengelola dan menyediakan sumber daya informasi, buku, dan jurnal ilmiah guna menunjang Tri Dharma Perguruan Tinggi.",
};

export default function UptPerpustakaanPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <PerpustakaanHero />
        <PerpustakaanTentang />
        <PerpustakaanTugas />
        <PerpustakaanLayanan />
      </div>

    </main>
  );
}
