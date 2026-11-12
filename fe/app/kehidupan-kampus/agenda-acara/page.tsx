import type { Metadata } from "next";
import {
  AgendaHero,
  AgendaKalender,
  AgendaMendatang,
  AgendaPilihan,
} from "@/components/agenda-acara";

export const metadata: Metadata = {
  title: "Agenda Acara — Universitas LIA",
  description:
    "Lihat rencana kegiatan, acara kampus, seminar, dan aktivitas lain yang akan berlangsung di Universitas LIA.",
};

export default function AgendaAcaraPage() {
  return (
    <main className="agenda-page">
      <div className="agenda-content">
        <AgendaHero />
        <AgendaPilihan />
        <AgendaMendatang />
        <AgendaKalender />
      </div>

    </main>
  );
}
