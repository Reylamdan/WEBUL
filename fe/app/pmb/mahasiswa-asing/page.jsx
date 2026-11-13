import { MahasiswaAsingContent } from "@/components/pmb/mahasiswa-asing/mahasiswa-asing-content";
import { MahasiswaAsingHeader } from "@/components/pmb/mahasiswa-asing/mahasiswa-asing-header";
import "@/components/pmb/mahasiswa-asing/mahasiswa-asing.css";

export const metadata = {
  title: "Mahasiswa Asing — Universitas LIA",
  description:
    "Informasi persyaratan dan dokumen izin belajar untuk mahasiswa asing di Universitas LIA.",
};

export default function MahasiswaAsingPage() {
  return (
    <main className="mahasiswa-asing-page">
      <MahasiswaAsingHeader />
      <MahasiswaAsingContent />
    </main>
  );
}
