import type { Metadata } from "next";
import { CaraPembayaranContent } from "@/components/pmb/cara-pembayaran/cara-pembayaran-content";

export const metadata: Metadata = {
  title: "Cara Pembayaran — Universitas LIA",
  description:
    "Panduan mendapatkan kode Virtual Account dan melakukan pembayaran tagihan mahasiswa Universitas LIA.",
};

export default function CaraPembayaranPage() {
  return <CaraPembayaranContent />;
}
