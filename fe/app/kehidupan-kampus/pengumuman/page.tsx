import type { Metadata } from "next";
import { PengumumanHero, PengumumanList } from "@/components/pengumuman";

export const metadata: Metadata = {
  title: "Pengumuman — Universitas LIA",
  description:
    "Pusat informasi untuk pengumuman akademik, administrasi, dan pemberitahuan penting bagi sivitas akademika Universitas LIA.",
};

export default function PengumumanPage() {
  return (
    <main className="pengumuman-page">
      <PengumumanHero />
      <section className="pengumuman-main-section">
        <div className="pengumuman-wrap">
          <PengumumanList />
        </div>
      </section>

    </main>
  );
}
