import type { Metadata } from "next";
import {
  FasilitasGallery,
  FasilitasHero,
} from "@/components/fasilitas-kampus";
import { Icon } from "@/components/icons";

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

