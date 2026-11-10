import { ScrollReveal } from "@/components/scroll-reveal";

export function PmbCta() {
  return (
    <ScrollReveal delay={140}>
      <section
        aria-label="Hubungi penerimaan mahasiswa baru"
        className="pmb-cta"
      >
        <div className="pmb-wrap pmb-cta-inner">
          <div>
            <span className="pmb-eyebrow pmb-eyebrow-light">SIAP MEMULAI?</span>

            <h2>Perjalananmu dimulai di Universitas LIA</h2>

            <p>
              Hubungi tim kami untuk memperoleh informasi PMB yang sesuai dengan kebutuhanmu.
            </p>
          </div>

          <a
            className="button button-light"
            href="mailto:humas@universitaslia.ac.id?subject=Informasi%20PMB"
          >
            Hubungi tim PMB <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </ScrollReveal>
  );
}

