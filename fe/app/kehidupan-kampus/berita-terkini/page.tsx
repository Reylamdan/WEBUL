import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BeritaDetailModal,
  BeritaHero,
  BeritaJelajahi,
  BeritaLainnya,
  BeritaSorotan,
} from "@/components/berita-terkini";

export const metadata: Metadata = {
  title: "Berita Terkini — Universitas LIA",
  description:
    "Ikuti kabar terbaru, cerita inspiratif, dan berbagai aktivitas dari lingkungan Universitas LIA.",
};

export default function BeritaTerkiniPage() {
  return (
    <main className="berita-page">
      <div className="berita-content">
        <BeritaHero />
        <BeritaSorotan />
        <BeritaJelajahi />
        <BeritaLainnya />
      </div>
      <Suspense fallback={null}>
        <BeritaDetailModal />
      </Suspense>
    </main>
  );
}
