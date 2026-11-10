import { ScrollReveal } from "@/components/scroll-reveal";

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

export function PmbPreparation() {
  return (
    <ScrollReveal delay={140}>
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
              Ikuti langkah awal berikut, lalu pastikan jalur dan jadwal yang tersedia langsung kepada tim PMB.
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

          {/* PERSYARATAN */}
          <div className="pmb-subsection" id="persyaratan">
            <div className="pmb-section-heading pmb-section-heading-small">
              <span className="pmb-eyebrow">CHECKLIST AWAL</span>

              <h2>Syarat pendaftaran</h2>

              <p>
                Persiapkan dokumen dasar dan cek kembali persyaratan resmi sesuai jalur yang kamu pilih.
              </p>
            </div>

            <div className="pmb-info-grid">
              {requirements.map((item, index) => (
                <article className="pmb-info-card" key={item.title}>
                  <span aria-hidden="true" className="pmb-info-icon">
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
    </ScrollReveal>
  );
}

