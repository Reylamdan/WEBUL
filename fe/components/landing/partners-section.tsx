import { SectionHeading } from "./section-heading";
import { ScrollReveal } from "@/components/scroll-reveal";

export function PartnersSection({
  partners,
  title = "Mitra Kami",
}: {
  partners: string[];
  title?: string;
}) {
  return (
    <ScrollReveal delay={70}>
    <section className="partners-section">
      <div className="content-wrap">
        <SectionHeading title={title} />
        <div aria-label="Logo mitra" className="partners-grid">
          {partners.map((partner, index) => (
            <div className="partner-logo" key={partner}>
              <span className={`partner-mark partner-mark-${index % 4}`} />
              <span>{partner}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
    </ScrollReveal>
  );
}
