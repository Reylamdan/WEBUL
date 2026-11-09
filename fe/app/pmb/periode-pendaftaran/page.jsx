import { PeriodeHeader } from "@/components/pmb/periode-pendaftaran/periode-header";
import { PeriodeTable } from "@/components/pmb/periode-pendaftaran/periode-table";

export const metadata = {
  title: "Periode Pendaftaran — Universitas LIA",
  description:
    "Informasi jadwal penerimaan mahasiswa baru Universitas LIA.",
};

export default function PeriodePendaftaranPage() {
  return (
    <main className="pmb-period-page">
      <PeriodeHeader />
      <PeriodeTable />
    </main>
  );
}
