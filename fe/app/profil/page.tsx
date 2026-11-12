import type { Metadata } from "next";
import {
  ProfilHero,
  ProfilJelajahi,
  ProfilMengenal,
} from "@/components/profil";

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

    </main>
  );
}
