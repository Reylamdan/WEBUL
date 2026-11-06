import type { Metadata } from "next";
import { KalenderAkademikPage } from "@/components/akademik/kalender-akademik";

export const metadata: Metadata = {
  title: "Kalender Akademik — Universitas LIA",
  description: "Kalender akademik Universitas LIA semester genap 2025/2026 dan gasal 2026/2027.",
};

export default function AkademikKalenderPage() {
  return <KalenderAkademikPage />;
}
