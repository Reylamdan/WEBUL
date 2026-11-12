import type { Metadata } from "next";
import { UkmHero, UkmContent, UkmCta } from "@/components/kegiatan-mahasiswa";

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

    </main>
  );
}
