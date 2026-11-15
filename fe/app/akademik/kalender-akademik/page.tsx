import type { Metadata } from "next";
import { KalenderAkademikPage } from "@/components/akademik/kalender-akademik";

export const metadata: Metadata = {
  title: "Kalender Akademik — Universitas LIA",
  description: "Jadwal kegiatan akademik resmi Universitas LIA yang dapat disaring berdasarkan kategori, bulan, dan tahun.",
};

export default function AkademikKalenderPage() {
  return <KalenderAkademikPage />;
}