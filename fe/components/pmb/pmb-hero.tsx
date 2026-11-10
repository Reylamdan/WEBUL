import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function PmbHero() {
  return (
    <ScrollReveal>
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
            Temukan program studi yang sesuai, siapkan kebutuhan pendaftaran, dan mulai perjalanan bersama Universitas LIA.
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
            Informasi jadwal dan ketentuan dapat berubah. Konfirmasikan detail terbaru kepada tim PMB.
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
    </ScrollReveal>
  );
}

