import type { Metadata } from "next";
import { UnitBagianHub } from "@/components/unit-dan-bagian";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Unit dan Bagian — Universitas LIA",
  description:
    "Daftar Unit Pelaksana Teknis dan biro administrasi yang menjalankan tata kelola akademik dan kelembagaan di Universitas LIA.",
};

export default function UnitDanBagianPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <UnitBagianHub />
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

