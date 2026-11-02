import { SectionHeading } from "./section-heading";

const defaultPartners = [
  "lia",
  "digital",
  "global",
  "edu",
  "creative",
  "tech",
  "language",
  "future",
  "media",
  "institute",
  "connect",
  "learning",
];

export function PartnersSection({ partners = defaultPartners }: { partners?: string[] }) {
  return (
    <section className="partners-section">
      <div className="content-wrap">
        <SectionHeading title="Mitra Kami" />
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
  );
}
