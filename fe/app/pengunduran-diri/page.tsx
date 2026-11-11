import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pengunduran Diri — Universitas LIA",
  description:
    "Syarat dan ketentuan pengunduran diri mahasiswa Universitas LIA.",
};

const terms = [
  "Mahasiswa yang mengundurkan diri karena diterima PTN wajib menyertakan surat keterangan dari kampus yang bersangkutan, dan biaya yang sudah dibayarkan akan dikembalikan 80%.",
  "Mahasiswa yang mengundurkan diri karena sakit keras dan perlu dirawat wajib menyertakan surat keterangan dari dokter, dan biaya yang sudah dibayarkan akan dikembalikan 80% jika waktu pengunduran diri sebelum kegiatan perkuliahan dimulai.",
  "Mahasiswa yang mengundurkan diri di luar poin 1 dan 2, maka biaya yang sudah dibayarkan tidak dapat dikembalikan.",
];

export default function PengunduranDiriPage() {
  return (
    <main className="resignation-page">
      <section aria-labelledby="resignation-title" className="resignation-hero">
        <div className="resignation-wrap">
          <nav aria-label="Breadcrumb" className="resignation-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/pmb">PMB</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Pengunduran Diri</span>
          </nav>
          <span className="resignation-eyebrow">INFORMASI PENTING</span>
          <h1 id="resignation-title">Pengunduran Diri</h1>
        </div>
      </section>

      <section
        aria-labelledby="resignation-terms-title"
        className="resignation-content resignation-wrap"
      >
        <div className="resignation-content-heading">
          <span className="resignation-heading-mark" aria-hidden="true" />
          <h2 id="resignation-terms-title">Syarat dan Ketentuan</h2>
        </div>
        <ol className="resignation-terms">
          {terms.map((term, index) => (
            <li className="resignation-term" key={term}>
              <span aria-hidden="true" className="resignation-term-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p>{term}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
