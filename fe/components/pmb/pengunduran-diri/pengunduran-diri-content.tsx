"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { resignationApi, type ResignationTermItem } from "@/lib/api";

const DEFAULT_TERMS: ResignationTermItem[] = [
  {
    id: "default-term-1",
    title: "Diterima di PTN",
    description:
      "Mahasiswa yang mengundurkan diri karena diterima PTN wajib menyertakan surat keterangan dari kampus yang bersangkutan, dan biaya yang sudah dibayarkan akan dikembalikan 80%.",
    refundPercentage: 80,
    sortOrder: 1,
  },
  {
    id: "default-term-2",
    title: "Sakit Keras / Perawatan Medis",
    description:
      "Mahasiswa yang mengundurkan diri karena sakit keras dan perlu dirawat wajib menyertakan surat keterangan dari dokter, dan biaya yang sudah dibayarkan akan dikembalikan 80% jika waktu pengunduran diri sebelum kegiatan perkuliahan dimulai.",
    refundPercentage: 80,
    sortOrder: 2,
  },
  {
    id: "default-term-3",
    title: "Alasan Lainnya",
    description:
      "Mahasiswa yang mengundurkan diri di luar poin 1 dan 2, maka biaya yang sudah dibayarkan tidak dapat dikembalikan.",
    refundPercentage: 0,
    sortOrder: 3,
  },
];

export function PengunduranDiriContent() {
  const { data } = useApi("public-resignation", () => resignationApi.get());

  const s = data?.settings;
  const heroEyebrow = s?.heroEyebrow || "INFORMASI PENTING";
  const heroTitle = s?.heroTitle || "Pengunduran Diri";
  const heroDescription = s?.heroDescription;
  const sectionTitle = s?.sectionTitle || "Syarat dan Ketentuan";

  const terms =
    data?.terms && data.terms.length > 0 ? data.terms : DEFAULT_TERMS;

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
          <span className="resignation-eyebrow">{heroEyebrow}</span>
          <h1 id="resignation-title">{heroTitle}</h1>
          {heroDescription && <p style={{ marginTop: "0.5rem", color: "#64748b" }}>{heroDescription}</p>}
        </div>
      </section>

      <section
        aria-labelledby="resignation-terms-title"
        className="resignation-content resignation-wrap"
      >
        <div className="resignation-content-heading">
          <span className="resignation-heading-mark" aria-hidden="true" />
          <h2 id="resignation-terms-title">{sectionTitle}</h2>
        </div>
        <ol className="resignation-terms">
          {terms.map((term, index) => (
            <li className="resignation-term" key={term.id || index}>
              <span aria-hidden="true" className="resignation-term-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                {term.title && (
                  <strong style={{ display: "block", marginBottom: "0.25rem", color: "#0f172a" }}>
                    {term.title}
                  </strong>
                )}
                <p>{term.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

