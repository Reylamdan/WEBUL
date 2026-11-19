import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export function AdmissionBanner({ content }: { content: HomepageContent["admission"] }) {
  return (
    <ScrollReveal>
    <section className="admission-banner" id="pmb">
      <div className="admission-inner">
        <div>
          <span className="eyebrow eyebrow-light">{content.eyebrow}</span>
          <h2>{content.title}</h2>
          <p>{content.description}</p>
        </div>
        <div className="admission-actions">
          <SmartLink className="button button-light" href={content.primaryHref}>
            {content.primaryLabel} <Icon name="arrow" size={16} />
          </SmartLink>
          <SmartLink href={content.secondaryHref}>
            {content.secondaryLabel} <Icon name="arrow" size={14} />
          </SmartLink>
        </div>
      </div>
    </section>
    </ScrollReveal>
  );
}
