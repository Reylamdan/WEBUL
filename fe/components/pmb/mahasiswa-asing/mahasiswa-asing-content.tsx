"use client";

import { Icon } from "@/components/icons";
import { useApi } from "@/lib/use-api";
import {
  foreignStudentApi,
  type ForeignStudentRequirementItem,
  type ForeignStudentSettings,
} from "@/lib/api";
import { MahasiswaAsingHeader } from "./mahasiswa-asing-header";

const DEFAULT_SETTINGS: ForeignStudentSettings = {
  heroTitle: "Mahasiswa Asing",
  introEyebrow: "PENERIMAAN MAHASISWA",
  introTitle: "Selamat datang di Universitas LIA",
  introDescription:
    "Mahasiswa asing adalah warga negara asing yang akan mengikuti pendidikan pada Universitas LIA.",
  requirementsEyebrow: "PERSIAPAN DOKUMEN",
  requirementsTitle: "Syarat dan Ketentuan",
  requirementsDescription:
    "Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib memenuhi dokumen persyaratan yang digunakan untuk mengurus izin belajar dibawah ini:",
  referenceTitle: "Referensi Dokumen",
  referenceDescription: "Contoh dokumen persyaratan dapat dilihat melalui link:",
  referenceUrl: "https://izinbelajar.kemdiktisaintek.go.id",
  referenceLabel: "izinbelajar.kemdiktisaintek.go.id",
};

const DEFAULT_REQUIREMENTS: ForeignStudentRequirementItem[] = [
  {
    id: "default-1",
    title: "Paspor",
    description: "Paspor",
    sortOrder: 1,
  },
  {
    id: "default-2",
    title: "Surat Pernyataan",
    description:
      "Surat Pernyataan tidak akan bekerja selama belajar di Indonesia, tidak berpartisipasi di dalam aktivitas politik dan mematuhi peraturan perundang-undangan yang ada di Indonesia (bermeterai)",
    sortOrder: 2,
  },
  {
    id: "default-3",
    title: "Ijazah & Transkrip",
    description: "Ijazah yang telah disetarakan, transkrip akademik, dan rapor terakhir",
    sortOrder: 3,
  },
  {
    id: "default-4",
    title: "Surat Jaminan Pembiayaan",
    description: "Surat Keterangan Jaminan Pembiayaan",
    sortOrder: 4,
  },
  {
    id: "default-5",
    title: "Surat Keterangan Sehat",
    description: "Surat Keterangan Sehat",
    sortOrder: 5,
  },
  {
    id: "default-6",
    title: "Foto Berwarna",
    description: "Foto berwarna ukuran paspor",
    sortOrder: 6,
  },
  {
    id: "default-7",
    title: "Paspor Penjamin",
    description: "Paspor orang tua atau penjamin",
    sortOrder: 7,
  },
  {
    id: "default-8",
    title: "KITAS",
    description: "Keterangan Izin Tinggal Terbatas / KITAS (khusus izin perpanjangan)",
    sortOrder: 8,
  },
  {
    id: "default-9",
    title: "Letter of Acceptance",
    description: "Surat keterangan diterima di Universitas LIA (Letter of Acceptance)",
    sortOrder: 9,
  },
];

export function MahasiswaAsingContent() {
  const { data } = useApi("public-foreign-students", () => foreignStudentApi.get());

  const settings = data?.settings || DEFAULT_SETTINGS;
  const requirements =
    data?.requirements && data.requirements.length > 0
      ? data.requirements
      : DEFAULT_REQUIREMENTS;

  const heroTitle = settings.heroTitle || DEFAULT_SETTINGS.heroTitle;
  const introEyebrow = settings.introEyebrow || DEFAULT_SETTINGS.introEyebrow;
  const introTitle = settings.introTitle || DEFAULT_SETTINGS.introTitle;
  const introDescription = settings.introDescription || DEFAULT_SETTINGS.introDescription;
  const requirementsEyebrow = settings.requirementsEyebrow || DEFAULT_SETTINGS.requirementsEyebrow;
  const requirementsTitle = settings.requirementsTitle || DEFAULT_SETTINGS.requirementsTitle;
  const requirementsDescription =
    settings.requirementsDescription || DEFAULT_SETTINGS.requirementsDescription;
  const referenceTitle = settings.referenceTitle || DEFAULT_SETTINGS.referenceTitle;
  const referenceDescription =
    settings.referenceDescription || DEFAULT_SETTINGS.referenceDescription;
  const referenceUrl = settings.referenceUrl || DEFAULT_SETTINGS.referenceUrl || "#";
  const referenceLabel = settings.referenceLabel || DEFAULT_SETTINGS.referenceLabel;

  return (
    <main className="mahasiswa-asing-page">
      <MahasiswaAsingHeader title={heroTitle} />
      <div className="mahasiswa-asing-content">
        <section
          aria-labelledby="mahasiswa-asing-intro-title"
          className="mahasiswa-asing-intro"
        >
          <span aria-hidden="true" className="mahasiswa-asing-intro-icon">
            <Icon name="globe" size={24} />
          </span>
          <div>
            <span className="mahasiswa-asing-eyebrow">{introEyebrow}</span>
            <h2 id="mahasiswa-asing-intro-title">{introTitle}</h2>
            <p>{introDescription}</p>
          </div>
        </section>

        <section
          aria-labelledby="mahasiswa-asing-requirements-title"
          className="mahasiswa-asing-requirements"
        >
          <div className="mahasiswa-asing-section-heading">
            <span className="mahasiswa-asing-eyebrow">{requirementsEyebrow}</span>
            <h2 id="mahasiswa-asing-requirements-title">{requirementsTitle}</h2>
            <p>{requirementsDescription}</p>
          </div>

          <ol className="mahasiswa-asing-list">
            {requirements.map((req, index) => (
              <li className="mahasiswa-asing-list-item" key={req.id || index}>
                <span aria-hidden="true" className="mahasiswa-asing-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{req.description}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside
          aria-labelledby="mahasiswa-asing-reference-title"
          className="mahasiswa-asing-reference"
        >
          <span aria-hidden="true" className="mahasiswa-asing-reference-icon">
            <Icon name="file" size={21} />
          </span>
          <div>
            <h2 id="mahasiswa-asing-reference-title">{referenceTitle}</h2>
            <p>{referenceDescription}</p>
          </div>
          <a
            href={referenceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {referenceLabel}
            <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </div>
    </main>
  );
}

