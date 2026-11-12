import type { Metadata } from "next";
import { UnitBagianHub } from "@/components/unit-dan-bagian";

export const metadata: Metadata = {
  title: "Unit dan Bagian — Universitas LIA",
  description:
    "Daftar Unit Pelaksana Teknis dan biro administrasi yang menjalankan tata kelola akademik dan kelembagaan di Universitas LIA.",
};

export default function UnitDanBagianPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <UnitBagianHub />
      </div>

    </main>
  );
}
