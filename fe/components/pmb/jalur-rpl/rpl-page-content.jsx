"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { rplApi } from "@/lib/api";

const DEFAULT_DOCUMENTS = [
  "KTP",
  "Akta kelahiran",
  "Kartu keluarga",
  "Ijazah",
  "Foto background merah",
  "Daftar Riwayat pekerjaan dengan rincian tugas yang dilakukan",
  "Sertifikat Kompetensi",
  "Sertifikat pengoperasian/lisensi yang dimiliki (misalnya, sertifikat pengajaran, dsb.)",
  "Dokumentasi pekerjaan yang pernah dilakukan (foto/video/produk/hasil tes, dll)",
  "Buku harian/catatan harian pekerjaan yang dilakukan di tempat kerja",
  "Lembar tugas / lembar kerja ketika bekerja di perusahaan",
  "Dokumen analisis/perancangan (parsial atau lengkap) ketika bekerja di perusahaan",
  "Logbook (Buku Catatan pekerjaan)",
  "Sertifikat Pelatihan disertai dengan uraian materi pelatihan dan lamanya pelatihan",
  "Keanggotaan asosiasi profesi yang relevan",
  "Referensi/surat keterangan/laporan verifikasi pihak ketiga dari pemberi kerja/supervisor",
  "Penghargaan dari industri",
  "Penilaian kinerja dari perusahaan.",
];

const DEFAULT_REQUIREMENTS = [
  "Lulusan SMA/SMK/MA sederajat yang memiliki pengalaman kerja di bidang yang relevan dengan program studi yang akan ditempuh",
  "Membayar biaya pendaftaran Rp100.000",
  "Memiliki sertifikat pelatihan atau bukti pengalaman kerja yang relevan",
  "Mengikuti asesmen tes",
];

const DEFAULT_STEPS = [
  {
    title: "Mengisi formulir RPL",
    description: "Lengkapi formulir pendaftaran dan berkas pendukung.",
  },
  {
    title: "Melakukan pembayaran asesmen",
    description: "Selesaikan pembayaran sesuai instruksi pendaftaran.",
  },
  {
    title: "Verifikasi formulir dan berkas",
    description: "Berkas pendaftaran akan diperiksa oleh tim terkait.",
  },
  {
    title: "Mengikuti wawancara dan tes asesmen",
    description: "Ikuti proses asesmen sesuai jadwal yang diberikan.",
  },
  {
    title: "Pengumuman hasil asesmen",
    description: "Periksa hasil asesmen melalui informasi dari tim PMB.",
  },
  {
    title: "Melakukan daftar ulang",
    description: "Selesaikan daftar ulang untuk melanjutkan proses penerimaan.",
  },
];

const DEFAULT_SCHEDULE = [
  { day: "Kamis", hours: "16:00 - 22:00 WIB" },
  { day: "Jumat", hours: "16:00 - 22:00 WIB" },
  { day: "Sabtu", hours: "08:00 - 20:00 WIB" },
];

const DEFAULT_FEES = [
  { type: "Pendaftaran", amount: "Rp100.000" },
  { type: "Asesmen", amount: "Rp3.000.000" },
  { type: "Kuliah", amount: "Rp4.500.000" },
];

export function RplPageContent() {
  const { data } = useApi("public-rpl", () => rplApi.get());

  const s = data?.settings;
  const heroEyebrow = s?.heroEyebrow || "JALUR PENERIMAAN MAHASISWA BARU";
  const heroTitle = s?.heroTitle || "Raih Sarjana dengan Pengalaman Kerja";
  const heroDescription =
    s?.heroDescription ||
    "Merupakan jalur penerimaan mahasiswa baru yang memberikan kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan atas pembelajaran yang telah diperoleh sebelumnya, baik melalui pengalaman kerja, pendidikan formal, informal, maupun nonformal";
  const heroArtMark = s?.heroArtMark || "RPL";
  const heroArtCaption = s?.heroArtCaption || "PENGALAMANMU\nPUNYA NILAI";

  const sectionEyebrow = s?.sectionEyebrow || "JALUR RPL";
  const sectionTitle = s?.sectionTitle || "Rekognisi Pembelajaran Lampau (RPL)";
  const benefits = s?.benefits && s.benefits.length > 0 ? s.benefits : ["Lulus lebih cepat", "Kuliah fleksibel", "Hemat biaya"];

  const scheduleNote = s?.scheduleNote || "Awal perkuliahan dilaksanakan bulan September 2026 pada:";
  const registrationDeadline = s?.registrationDeadline || "31 Juli 2026";
  const registrationUrl = s?.registrationUrl || "https://pmb.universitaslia.ac.id/home";

  const transferCreditTitle = s?.transferCreditTitle || "Transfer Kredit";
  const transferCreditDescription =
    s?.transferCreditDescription ||
    "Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil evaluasi terhadap pendidikan dan capaian pembelajaran sebelumnya.";

  // Lists
  const requirements =
    data?.requirements && data.requirements.length > 0
      ? data.requirements.map((r) => r.title)
      : DEFAULT_REQUIREMENTS;

  const documents =
    data?.documents && data.documents.length > 0
      ? data.documents.map((d) => d.title)
      : DEFAULT_DOCUMENTS;

  const applicationSteps =
    data?.steps && data.steps.length > 0
      ? data.steps
      : DEFAULT_STEPS;

  const courseSchedule =
    data?.schedules && data.schedules.length > 0
      ? data.schedules
      : DEFAULT_SCHEDULE;

  const fees =
    data?.fees && data.fees.length > 0
      ? data.fees
      : DEFAULT_FEES;

  return (
    <main className="pmb-rpl-page">
      <section aria-labelledby="rpl-title" className="pmb-rpl-hero">
        <div className="pmb-rpl-wrap">
          <nav aria-label="Breadcrumb" className="pmb-breadcrumb">
            <Link href="/pmb">PMB</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Jalur RPL</span>
          </nav>
          <div className="pmb-rpl-hero-grid">
            <div className="pmb-rpl-hero-copy">
              <span className="pmb-eyebrow">{heroEyebrow}</span>
              <h1 id="rpl-title">{heroTitle}</h1>
              <p>{heroDescription}</p>
            </div>
            <div aria-hidden="true" className="pmb-rpl-hero-art">
              <span className="pmb-rpl-art-orbit pmb-rpl-art-orbit-one" />
              <span className="pmb-rpl-art-orbit pmb-rpl-art-orbit-two" />
              <span className="pmb-rpl-art-mark">{heroArtMark}</span>
              <span className="pmb-rpl-art-caption">
                {heroArtCaption.split("\n").map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx === 0 && <br />}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="rpl-description-title"
        className="pmb-rpl-section pmb-rpl-wrap"
      >
        <div className="pmb-section-heading">
          <span className="pmb-eyebrow">{sectionEyebrow}</span>
          <h2 id="rpl-description-title">{sectionTitle}</h2>
        </div>
        <div aria-label="Keunggulan Jalur RPL" className="pmb-rpl-benefits">
          {benefits.map((benefit, idx) => (
            <span key={idx}>✓ {benefit}</span>
          ))}
        </div>

        <div className="pmb-rpl-accordion" id="persyaratan-rpl">
          <h3 className="pmb-rpl-subheading">Persyaratan dan Dokumen</h3>
          <details className="pmb-rpl-details" open>
            <summary>Perolehan Kredit</summary>
            <div className="pmb-rpl-details-body">
              <div>
                <h4>Syarat pendaftaran</h4>
                <ul>
                  {requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Dokumen pendaftaran</h4>
                <ol>
                  {documents.map((document, idx) => (
                    <li key={idx}>{document}</li>
                  ))}
                </ol>
              </div>
            </div>
          </details>
          <details className="pmb-rpl-details">
            <summary>{transferCreditTitle}</summary>
            <div className="pmb-rpl-details-body">
              <p>{transferCreditDescription}</p>
            </div>
          </details>
        </div>
      </section>

      <section
        aria-labelledby="rpl-schedule-title"
        className="pmb-rpl-section pmb-rpl-section-tinted"
      >
        <div className="pmb-rpl-wrap">
          <div className="pmb-rpl-detail-block">
            <h2 id="rpl-schedule-title">Jadwal Perkuliahan</h2>
            <p>{scheduleNote}</p>
            <div className="pmb-rpl-table-wrap">
              <table className="pmb-rpl-schedule-table">
                <tbody>
                  {courseSchedule.map((schedule, idx) => (
                    <tr key={schedule.id || schedule.day || idx}>
                      <th scope="row">{schedule.day}</th>
                      <td>{schedule.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pmb-rpl-detail-block">
            <h2>Batas Pendaftaran</h2>
            <p>{registrationDeadline}</p>
          </div>

          <div className="pmb-rpl-detail-block pmb-rpl-application-block">
            <h2>Alur Pendaftaran</h2>
            <ol className="pmb-rpl-application-steps">
              <li>
                <span className="pmb-rpl-step-index">01</span>
                <span className="pmb-rpl-step-copy">
                  <strong>Registrasi online</strong>
                  <span>
                    Daftar melalui{" "}
                    <a href={registrationUrl} rel="noreferrer" target="_blank">
                      portal PMB Universitas LIA
                    </a>
                    .
                  </span>
                </span>
              </li>
              {applicationSteps.map((step, index) => (
                <li key={step.id || step.title || index}>
                  <span className="pmb-rpl-step-index">
                    {String(index + 2).padStart(2, "0")}
                  </span>
                  <span className="pmb-rpl-step-copy">
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pmb-rpl-detail-block">
            <h2>Biaya</h2>
            <div className="pmb-rpl-table-wrap">
              <table className="pmb-rpl-fees-table">
                <thead>
                  <tr>
                    {fees.map((fee, idx) => (
                      <th key={fee.id || fee.type || idx} scope="col">
                        {fee.type}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fees.map((fee, idx) => (
                      <td key={fee.id || fee.type || idx}>{fee.amount}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pmb-rpl-register">
            <a
              className="button button-primary"
              href={registrationUrl}
              rel="noreferrer"
              target="_blank"
            >
              Daftar di sini <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

