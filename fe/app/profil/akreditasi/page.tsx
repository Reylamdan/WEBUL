import type { Metadata } from "next";
import {
  AkreditasiHero,
  AkreditasiInstitusi,
  AkreditasiProgramStudi,
} from "@/components/akreditasi";

export const metadata: Metadata = {
  title: "Akreditasi — Universitas LIA",
  description:
    "Informasi akreditasi institusi dan program studi Universitas LIA.",
};

export default function AkreditasiPage() {
  return (
    <main className="akreditasi-page">
      <div className="akreditasi-content">
        <AkreditasiHero />
        <AkreditasiInstitusi />
        <AkreditasiProgramStudi />
      </div>

    </main>
  );
}
