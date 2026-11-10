import { ScrollReveal } from "@/components/scroll-reveal";
import { ImportantInformation } from "./important-information";

export function PmbImportant() {
  return (
    <ScrollReveal delay={210}>
      <section
        aria-labelledby="pmb-important-title"
        className="pmb-section pmb-wrap"
      >
        <div className="pmb-section-heading">
          <span className="pmb-eyebrow">INFORMASI PENTING</span>

          <h2 id="pmb-important-title">Informasi untuk calon mahasiswa</h2>

          <p>
            Temukan informasi penting untuk membantu persiapan pendaftaran dan kehidupan perkuliahanmu.
          </p>
        </div>

        <ImportantInformation />
      </section>
    </ScrollReveal>
  );
}

