import type { Metadata } from "next";
import {
  PmbCta,
  PmbExperience,
  PmbFaq,
  PmbHero,
  PmbImportant,
  PmbPreparation,
  PmbPrograms,
} from "@/components/pmb";

export const metadata: Metadata = {
  title: "Penerimaan Mahasiswa Baru — Universitas LIA",
  description:
    "Jelajahi program studi, persiapan pendaftaran, informasi biaya, dan beasiswa Universitas LIA.",
};

export default function PmbPage() {
  return (
    <main className="pmb-page">
      <PmbHero />
      <PmbPrograms />
      <PmbPreparation />
      <PmbImportant />
      <PmbExperience />
      <PmbFaq />
      <PmbCta />
    </main>
  );
}
