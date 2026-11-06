import type { Metadata } from "next";
import { UkmHero, UkmContent, UkmCta } from "@/components/kegiatan-mahasiswa";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Kegiatan Mahasiswa (UKM) — Universitas LIA",
  description:
    "Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas melalui Unit Kegiatan Mahasiswa Universitas LIA.",
};

export default function KegiatanMahasiswaPage() {
  return (
    <main className="ukm-page">
      <UkmHero />
      <section className="ukm-main-section">
        <div className="ukm-wrap">
          <UkmContent />
          <UkmCta />
        </div>
      </section>

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

