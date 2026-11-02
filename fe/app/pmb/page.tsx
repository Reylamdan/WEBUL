import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Penerimaan Mahasiswa Baru — Universitas LIA",
  description:
    "Jelajahi program studi, persiapan pendaftaran, informasi biaya, dan beasiswa Universitas LIA.",
};

const programs = [
  { name: "S1 Desain Komunikasi Visual", group: "Humaniora & Desain", level: "Sarjana" },
  { name: "S1 Bahasa Inggris", group: "Humaniora & Desain", level: "Sarjana" },
  { name: "S1 Bahasa Jepang", group: "Humaniora & Desain", level: "Sarjana" },
  { name: "D3 Bahasa Inggris", group: "Humaniora & Desain", level: "Diploma" },
  { name: "S1 Bisnis Digital", group: "Sains & Bisnis", level: "Sarjana" },
  { name: "S1 Sistem Informasi", group: "Sains & Bisnis", level: "Sarjana" },
  { name: "S1 Informatika", group: "Sains & Bisnis", level: "Sarjana" },
];

const preparation = [
  {
    number: "01",
    title: "Kenali program studi",
    text: "Pilih bidang yang sesuai dengan minat dan rencana masa depanmu.",
  },
  {
    number: "02",
    title: "Konsultasikan rencana",
    text: "Hubungi tim PMB untuk menanyakan jadwal, jalur, dan ketentuan pendaftaran terbaru.",
  },
  {
    number: "03",
    title: "Lengkapi persyaratan",
    text: "Siapkan dokumen sesuai panduan resmi yang diberikan untuk periode pendaftaran.",
  },
];

const requirements = [
  {
    title: "Identitas diri",
    text: "Siapkan identitas diri yang masih berlaku untuk proses pendaftaran.",
  },
  {
    title: "Dokumen pendidikan",
    text: "Ijazah atau dokumen pendidikan terakhir sesuai ketentuan jalur yang dipilih.",
  },
  {
    title: "Informasi pendaftaran",
    text: "Periksa kembali formulir dan dokumen tambahan pada panduan PMB terbaru.",
  },
];

const supportTopics = [
  {
    title: "Biaya kuliah",
    text: "Rincian biaya dapat berbeda menurut program studi dan periode penerimaan. Hubungi tim PMB untuk memperoleh informasi terbaru.",
    href: "mailto:humas@universitaslia.ac.id?subject=Informasi%20Biaya%20Kuliah",
    action: "Tanyakan biaya kuliah",
  },
  {
    title: "Beasiswa",
    text: "Tanyakan ketersediaan, jadwal, dan persyaratan beasiswa yang berlaku pada periode pendaftaran.",
    href: "mailto:humas@universitaslia.ac.id?subject=Informasi%20Beasiswa",
    action: "Tanyakan beasiswa",
  },
  {
    title: "Konsultasi pendaftaran",
    text: "Tim PMB dapat membantu menjawab pertanyaan tentang program studi dan langkah pendaftaran.",
    href: "mailto:humas@universitaslia.ac.id?subject=Konsultasi%20PMB",
    action: "Hubungi tim PMB",
  },
];

const faqs = [
  {
    question: "Bagaimana mengetahui jadwal pendaftaran terbaru?",
    answer:
      "Hubungi tim PMB Universitas LIA untuk mendapatkan jadwal dan panduan resmi periode penerimaan yang sedang berlangsung.",
  },
  {
    question: "Dokumen apa saja yang perlu disiapkan?",
    answer:
      "Persyaratan dapat bergantung pada program dan jalur pendaftaran. Gunakan daftar di halaman ini sebagai persiapan awal, lalu konfirmasikan dokumen lengkap kepada tim PMB.",
  },
  {
    question: "Bagaimana cara mengetahui biaya dan beasiswa?",
    answer:
      "Biaya, pilihan pembayaran, dan ketersediaan beasiswa dapat berubah. Silakan hubungi tim PMB untuk informasi sesuai periode pendaftaran.",
  },
];

export default function PmbPage() {
  return (
    <main className="pmb-page">
      <section aria-labelledby="pmb-title" className="pmb-hero pmb-wrap">
        <div className="pmb-hero-copy">
          <nav aria-label="Breadcrumb" className="pmb-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">PMB</span>
          </nav>
          <span className="pmb-eyebrow">PENERIMAAN MAHASISWA BARU</span>
          <h1 id="pmb-title">Langkah awal menuju masa depanmu</h1>
          <p>
            Temukan program studi yang sesuai, siapkan kebutuhan pendaftaran,
            dan mulai perjalanan bersama Universitas LIA.
          </p>
          <div className="pmb-hero-actions">
            <a className="button button-primary" href="#program-pilihan">
              Temukan program <span aria-hidden="true">→</span>
            </a>
            <a className="pmb-text-link" href="#jalur-pendaftaran">
              Panduan pendaftaran <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="pmb-note">
            Informasi jadwal dan ketentuan dapat berubah. Konfirmasikan detail
            terbaru kepada tim PMB.
          </p>
        </div>
        <div aria-hidden="true" className="pmb-hero-art">
          <div className="pmb-art-sun" />
          <div className="pmb-art-photo">
            <span className="pmb-art-people pmb-art-person-one" />
            <span className="pmb-art-people pmb-art-person-two" />
            <span className="pmb-art-people pmb-art-person-three" />
            <span className="pmb-art-people pmb-art-person-four" />
            <span className="pmb-art-people pmb-art-person-five" />
            <span className="pmb-art-stage" />
          </div>
          <div className="pmb-art-caption">
            <span>MASA DEPAN DIMULAI DARI SINI</span>
            <strong>Belajar. Berkembang. Berdampak.</strong>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="pmb-program-title"
        className="pmb-section pmb-wrap"
        id="program-pilihan"
      >
        <div className="pmb-section-heading">
          <span className="pmb-eyebrow">PILIHAN STUDI</span>
          <h2 id="pmb-program-title">Temukan program studi pilihanmu</h2>
          <p>
            Jelajahi bidang humaniora, desain, sains, dan bisnis yang tersedia
            di Universitas LIA.
          </p>
        </div>
        <div className="pmb-program-grid">
          {programs.map((program, index) => (
            <Link
              className="pmb-program-card"
              href="/akademik/fakultas#program-list"
              key={program.name}
            >
              <span className="pmb-program-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="pmb-program-group">{program.group}</span>
              <strong>{program.name}</strong>
              <span className="pmb-program-level">{program.level}</span>
              <span aria-hidden="true" className="pmb-program-arrow">↗</span>
            </Link>
          ))}
        </div>
        <Link className="pmb-text-link pmb-all-programs" href="/akademik/fakultas">
          Lihat informasi fakultas <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section
        aria-labelledby="pmb-path-title"
        className="pmb-section pmb-section-tinted"
        id="jalur-pendaftaran"
      >
        <div className="pmb-wrap">
          <div className="pmb-section-heading">
            <span className="pmb-eyebrow">MULAI DARI SINI</span>
            <h2 id="pmb-path-title">Persiapkan pendaftaranmu</h2>
            <p>
              Ikuti langkah awal berikut, lalu pastikan jalur dan jadwal yang
              tersedia langsung kepada tim PMB.
            </p>
          </div>
          <div className="pmb-step-grid">
            {preparation.map((step) => (
              <article className="pmb-step-card" key={step.number}>
                <span className="pmb-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>

          <div className="pmb-subsection" id="persyaratan">
            <div className="pmb-section-heading pmb-section-heading-small">
              <span className="pmb-eyebrow">CHECKLIST AWAL</span>
              <h2>Syarat pendaftaran</h2>
              <p>
                Persiapkan dokumen dasar dan cek kembali persyaratan resmi sesuai
                jalur yang kamu pilih.
              </p>
            </div>
            <div className="pmb-info-grid">
              {requirements.map((item, index) => (
                <article className="pmb-info-card" key={item.title}>
                  <span className="pmb-info-icon" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Biaya, beasiswa, dan konsultasi" className="pmb-section pmb-wrap">
        <div className="pmb-section-heading">
          <span className="pmb-eyebrow">INFORMASI PENTING</span>
          <h2>Rencanakan langkahmu</h2>
          <p>
            Dapatkan informasi biaya, beasiswa, dan pendaftaran langsung dari
            tim Universitas LIA.
          </p>
        </div>
        <div className="pmb-info-grid">
          {supportTopics.map((topic, index) => (
            <article className="pmb-info-card pmb-support-card" key={topic.title}>
              <span className="pmb-info-icon" aria-hidden="true">
                {["Rp", "★", "?"][index]}
              </span>
              <h3>{topic.title}</h3>
              <p>{topic.text}</p>
              <a href={topic.href}>{topic.action} <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="pmb-experience-title" className="pmb-experience pmb-wrap">
        <div aria-hidden="true" className="pmb-experience-art">
          <span className="pmb-experience-orbit" />
          <span className="pmb-experience-mark">LIA</span>
          <span className="pmb-experience-caption">RUANG UNTUK BERTUMBUH</span>
        </div>
        <div className="pmb-experience-copy">
          <span className="pmb-eyebrow">LEBIH DARI SEKADAR KULIAH</span>
          <h2 id="pmb-experience-title">Bekal untuk terus berkembang</h2>
          <p>
            Bangun pengetahuan, temukan minat, dan bertumbuh bersama komunitas
            kampus yang mendukung perjalanan belajarmu.
          </p>
          <ul>
            <li>Belajar dalam lingkungan akademik yang suportif</li>
            <li>Mengembangkan keterampilan sesuai bidang pilihan</li>
            <li>Mengenal komunitas dan kehidupan kampus</li>
          </ul>
          <Link className="pmb-text-link" href="/#kehidupan">
            Kenali kehidupan kampus <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="pmb-faq-title" className="pmb-faq pmb-section-tinted">
        <div className="pmb-wrap">
          <div className="pmb-section-heading">
            <span className="pmb-eyebrow">BUTUH INFORMASI?</span>
            <h2 id="pmb-faq-title">Pertanyaan seputar pendaftaran</h2>
          </div>
          <div className="pmb-faq-list">
            {faqs.map((faq) => (
              <details className="pmb-faq-item" key={faq.question}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Hubungi penerimaan mahasiswa baru" className="pmb-cta">
        <div className="pmb-wrap pmb-cta-inner">
          <div>
            <span className="pmb-eyebrow pmb-eyebrow-light">SIAP MEMULAI?</span>
            <h2>Perjalananmu dimulai di Universitas LIA</h2>
            <p>
              Hubungi tim kami untuk memperoleh informasi PMB yang sesuai dengan
              kebutuhanmu.
            </p>
          </div>
          <a className="button button-light" href="mailto:humas@universitaslia.ac.id?subject=Informasi%20PMB">
            Hubungi tim PMB <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </main>
  );
}
