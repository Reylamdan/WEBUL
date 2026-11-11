import { BiayaHeader } from "@/components/pmb/biaya-kuliah/biaya-header";
import { BiayaTable } from "@/components/pmb/biaya-kuliah/biaya-table";

export const metadata = {
  title: "Biaya Kuliah — Universitas LIA",
  description:
    "Informasi contoh UKT Universitas LIA berdasarkan gelombang pendaftaran.",
};

export default function BiayaKuliahPage() {
  return (
    <main className="pmb-tuition-page">
      <BiayaHeader />
      <BiayaTable />
    </main>
  );
}
