import type { Metadata } from "next";
import {
  ProfilHero,
  ProfilJelajahi,
  ProfilMengenal,
} from "@/components/profil";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Profil Universitas LIA — Universitas LIA",
  description:
    "Mengenal Universitas LIA, perjalanan institusi, nilai, dan lingkungan akademik yang mendukung pengembangan kompetensi.",
};

export default function ProfilePage() {
  return (
    <main className="profile-page">
      <div className="profile-content">
        <ProfilHero />
        <ProfilMengenal />
        <ProfilJelajahi />
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
