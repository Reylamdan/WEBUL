import { Icon } from "@/components/icons";

export function SectionHeading({
  eyebrow,
  title,
  link,
  href = "#kabar",
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && (
        <a className="text-link" href={href}>
          {link} <Icon name="arrow" size={16} />
        </a>
      )}
    </div>
  );
}
