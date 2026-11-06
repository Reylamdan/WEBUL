import { ScrollReveal } from "@/components/scroll-reveal";

export function AkreditasiInstitusi() {
  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="institusi-title" className="akreditasi-section akreditasi-wrap">
        <div className="akreditasi-institusi-grid">
          <div className="akreditasi-institusi-copy">
            <span className="akreditasi-eyebrow">AKREDITASI INSTITUSI</span>
            <h2 className="akreditasi-section-title" id="institusi-title">
              Peringkat Akreditasi Universitas
            </h2>
            <p className="akreditasi-lead">
              Universitas LIA berkomitmen menjaga standar mutu pendidikan tinggi.
            </p>
            <p className="akreditasi-body-text">
              Status akreditasi institusi merupakan bukti komitmen kami dalam menyelenggarakan tata kelola dan layanan akademik yang berkualitas sesuai dengan standar nasional.
            </p>
          </div>

          <div className="akreditasi-institusi-visual">
            <div aria-hidden="true" className="akreditasi-placeholder-box" />
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

