import type { Metadata } from "next";
import {
  BauskAudit,
  BauskHero,
  BauskKegiatan,
  BauskSarpras,
  BauskTentang,
} from "@/components/unit-dan-bagian";

export const metadata: Metadata = {
  title: "BAUSK — Universitas LIA",
  description:
    "Bagian Administrasi Umum, Sumber Daya Manusia dan Keuangan (BAUSK) Universitas LIA menyelenggarakan urusan sarana prasarana, aset, penerimaan UKT, operasional, akuntansi keuangan, serta pengembangan dosen dan tendik.",
};

export default function BauskPage() {
  return (
    <main className="upt-page">
      <div className="upt-content">
        <BauskHero />
        <BauskTentang />
        <BauskKegiatan />
        <BauskSarpras />
        <BauskAudit />
      </div>

    </main>
  );
}
