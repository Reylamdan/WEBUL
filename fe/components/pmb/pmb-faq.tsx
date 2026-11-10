import { ScrollReveal } from "@/components/scroll-reveal";

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

export function PmbFaq() {
  return (
    <ScrollReveal delay={70}>
      <section
        aria-labelledby="pmb-faq-title"
        className="pmb-faq pmb-section-tinted"
      >
        <div className="pmb-wrap">
          <div className="pmb-section-heading">
            <span className="pmb-eyebrow">BUTUH INFORMASI?</span>

            <h2 id="pmb-faq-title">Pertanyaan seputar pendaftaran</h2>
          </div>

          <div className="pmb-faq-list">
            {faqs.map((faq) => (
              <details className="pmb-faq-item" key={faq.question}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true">+</span>
                </summary>

                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

