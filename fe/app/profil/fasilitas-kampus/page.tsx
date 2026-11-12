import type { Metadata } from "next";
import {
  FasilitasGallery,
  FasilitasHero,
} from "@/components/fasilitas-kampus";

export const metadata: Metadata = {
  title: "Fasilitas Kampus — Universitas LIA",
  description:
    "Kenali fasilitas kampus yang mendukung kegiatan belajar, kolaborasi, dan kehidupan mahasiswa.",
};

export default function FasilitasKampusPage() {
  return (
    <main className="fasilitas-page">
      <div className="fasilitas-content">
        <FasilitasHero />
        <FasilitasGallery />
      </div>

    </main>
  );
}
