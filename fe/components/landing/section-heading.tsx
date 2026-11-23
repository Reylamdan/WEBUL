import { Icon } from "@/components/icons";
import { SmartLink } from "@/components/smart-link";

export function SectionHeading({
  eyebrow,
  title,
  link,
  href = "#kabar",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={`lp-head${className ? ` ${className}` : ""}`}>
      <div>
        {eyebrow ? <span className="lp-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {link ? (
        <SmartLink className="lp-link" href={href}>
          {link} <Icon name="arrow" size={16} />
        </SmartLink>
      ) : null}
    </div>
  );
}
