import type { Metadata } from "next";
import { PengunduranDiriContent } from "@/components/pmb/pengunduran-diri/pengunduran-diri-content";

export const metadata: Metadata = {
  title: "Pengunduran Diri — Universitas LIA",
  description:
    "Syarat dan ketentuan pengunduran diri mahasiswa Universitas LIA.",
};

export default function PmbPengunduranDiriPage() {
  return <PengunduranDiriContent />;
}

