import { MahasiswaAsingContent } from "@/components/pmb/mahasiswa-asing/mahasiswa-asing-content";
import "@/components/pmb/mahasiswa-asing/mahasiswa-asing.css";

export const metadata = {
  title: "Mahasiswa Asing — Universitas LIA",
  description:
    "Informasi persyaratan dan dokumen izin belajar untuk mahasiswa asing di Universitas LIA.",
};

export default function MahasiswaAsingPage() {
  return <MahasiswaAsingContent />;
}
