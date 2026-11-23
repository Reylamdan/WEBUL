import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export function AdmissionBanner({ content }: { content: HomepageContent["admission"] }) {
  return (
    <ScrollReveal>
      <section className="lp-admission" id="pmb">
        <div className="lp-wrap lp-admission-inner">
          <div>
            <span className="lp-eyebrow">{content.eyebrow}</span>
            <h2>{content.title}</h2>
            <p>{content.description}</p>
          </div>
          <div className="lp-admission-actions">
            <SmartLink className="lp-btn lp-btn-light" href={content.primaryHref}>
              {content.primaryLabel} <Icon name="arrow" size={16} />
            </SmartLink>
            <SmartLink className="lp-link" href={content.secondaryHref}>
              {content.secondaryLabel} <Icon name="arrow" size={15} />
            </SmartLink>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
