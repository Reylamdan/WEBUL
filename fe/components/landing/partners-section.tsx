import { ScrollReveal } from "@/components/scroll-reveal";

export function PartnersSection({
  partners,
  title = "Mitra Kami",
}: {
  partners: string[];
  title?: string;
}) {
  return (
    <ScrollReveal>
      <section className="lp-partners">
        <div className="lp-wrap lp-partners-grid">
          <h2 className="lp-partners-title">{title}</h2>
          <ul aria-label="Daftar mitra" className="lp-partners-list">
            {partners.map((partner, index) => (
              <li key={partner}>
                <span aria-hidden="true" className={`lp-mark lp-mark-${index % 4}`} />
                {partner}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </ScrollReveal>
  );
}
