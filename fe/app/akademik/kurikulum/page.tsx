import type { Metadata } from "next";
import { KurikulumPage } from "@/components/akademik/kurikulum";

export const metadata: Metadata = {
  title: "Kurikulum — Universitas LIA",
  description:
    "Informasi pendekatan Outcome-Based Education dan komponen pembelajaran program studi Universitas LIA.",
};

export default function AkademikKurikulumPage() {
  return <KurikulumPage />;
}
