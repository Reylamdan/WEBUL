import Link from "next/link";

export const metadata = {
  title: "Jalur Rekognisi Pembelajaran Lampau (RPL) — Universitas LIA",
  description:
    "Informasi persyaratan, jadwal, alur, dan biaya pendaftaran Jalur Rekognisi Pembelajaran Lampau (RPL) Universitas LIA.",
};

const documents = [
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

const applicationSteps = [
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

const courseSchedule = [
  { day: "Kamis", hours: "16:00 - 22:00 WIB" },
  { day: "Jumat", hours: "16:00 - 22:00 WIB" },
  { day: "Sabtu", hours: "08:00 - 20:00 WIB" },
];

const fees = [
  { type: "Pendaftaran", amount: "Rp100.000" },
  { type: "Asesmen", amount: "Rp3.000.000" },
  { type: "Kuliah", amount: "Rp4.500.000" },
];

const registrationUrl = "https://pmb.universitaslia.ac.id/home";

export default function JalurRplPage() {
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
              <span className="pmb-eyebrow">JALUR PENERIMAAN MAHASISWA BARU</span>
              <h1 id="rpl-title">Raih Sarjana dengan Pengalaman Kerja</h1>
              <p>
                Merupakan jalur penerimaan mahasiswa baru yang memberikan
                kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan
                atas pembelajaran yang telah diperoleh sebelumnya, baik melalui
                pengalaman kerja, pendidikan formal, informal, maupun nonformal
              </p>
            </div>
            <div aria-hidden="true" className="pmb-rpl-hero-art">
              <span className="pmb-rpl-art-orbit pmb-rpl-art-orbit-one" />
              <span className="pmb-rpl-art-orbit pmb-rpl-art-orbit-two" />
              <span className="pmb-rpl-art-mark">RPL</span>
              <span className="pmb-rpl-art-caption">
                PENGALAMANMU
                <br />
                PUNYA NILAI
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
          <span className="pmb-eyebrow">JALUR RPL</span>
          <h2 id="rpl-description-title">
            Rekognisi Pembelajaran Lampau (RPL)
          </h2>
        </div>
        <div aria-label="Keunggulan Jalur RPL" className="pmb-rpl-benefits">
          <span>✓ Lulus lebih cepat</span>
          <span>✓ Kuliah fleksibel</span>
          <span>✓ Hemat biaya</span>
        </div>

        <div className="pmb-rpl-accordion" id="persyaratan-rpl">
          <h3 className="pmb-rpl-subheading">Persyaratan dan Dokumen</h3>
          <details className="pmb-rpl-details" open>
            <summary>Perolehan Kredit</summary>
            <div className="pmb-rpl-details-body">
              <div>
                <h4>Syarat pendaftaran</h4>
                <ul>
                  <li>
                    Lulusan SMA/SMK/MA sederajat yang memiliki pengalaman kerja
                    di bidang yang relevan dengan program studi yang akan
                    ditempuh
                  </li>
                  <li>Membayar biaya pendaftaran Rp100.000</li>
                  <li>
                    Memiliki sertifikat pelatihan atau bukti pengalaman kerja
                    yang relevan
                  </li>
                  <li>Mengikuti asesmen tes</li>
                </ul>
              </div>
              <div>
                <h4>Dokumen pendaftaran</h4>
                <ol>
                  {documents.map((document) => (
                    <li key={document}>{document}</li>
                  ))}
                </ol>
              </div>
            </div>
          </details>
          <details className="pmb-rpl-details">
            <summary>Transfer Kredit</summary>
            <div className="pmb-rpl-details-body">
              <p>
                Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil
                evaluasi terhadap pendidikan dan capaian pembelajaran
                sebelumnya.
              </p>
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
            <p>
              Awal perkuliahan dilaksanakan bulan <strong>September 2026</strong>{" "}
              pada:
            </p>
            <div className="pmb-rpl-table-wrap">
              <table className="pmb-rpl-schedule-table">
                <tbody>
                  {courseSchedule.map((schedule) => (
                    <tr key={schedule.day}>
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
            <p>31 Juli 2026</p>
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
                <li key={step.title}>
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
                    {fees.map((fee) => (
                      <th key={fee.type} scope="col">
                        {fee.type}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fees.map((fee) => (
                      <td key={fee.type}>{fee.amount}</td>
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
