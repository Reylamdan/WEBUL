import type { Metadata } from "next";
import {
  AgendaHero,
  AgendaKalender,
  AgendaMendatang,
  AgendaPilihan,
} from "@/components/agenda-acara";
import { Icon } from "@/components/icons";

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

