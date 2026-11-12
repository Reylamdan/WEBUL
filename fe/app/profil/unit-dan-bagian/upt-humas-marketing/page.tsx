import type { Metadata } from "next";
import {
  HumasHero,
  HumasLayanan,
  HumasTentang,
  HumasTugas,
} from "@/components/unit-dan-bagian";

export const metadata: Metadata = {
  title: "UPT Humas dan Marketing — Universitas LIA",
  description:
    "Unit Pelaksana Teknis Humas dan Marketing Universitas LIA bertugas mempromosikan universitas, penerimaan mahasiswa baru, hubungan media dan masyarakat, serta memelihara citra dan reputasi institusi.",
};

export default function UptHumasMarketingPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <HumasHero />
        <HumasTentang />
        <HumasTugas />
        <HumasLayanan />
      </div>

    </main>
  );
}
