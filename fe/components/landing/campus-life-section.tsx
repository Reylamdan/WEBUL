import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export function CampusLifeSection({
  content,
  photoUrl,
}: {
  content: HomepageContent["campusLife"];
  photoUrl?: string | null;
}) {
  return (
    <ScrollReveal>
      <section className="lp-section lp-campus" id="kehidupan">
        <div className="lp-wrap">
          <div
            className={`lp-campus-photo${photoUrl ? " has-photo" : ""}`}
            style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
          >
            {content.photoLabel ? <span className="lp-photo-label">{content.photoLabel}</span> : null}
          </div>

          <div className="lp-campus-body">
            <div>
              <span className="lp-eyebrow">{content.eyebrow}</span>
              <h2>{content.title}</h2>
            </div>
            <div className="lp-campus-text">
              <p>{content.description}</p>
              <SmartLink className="lp-link" href={content.linkHref}>
                {content.linkLabel} <Icon name="arrow" size={16} />
              </SmartLink>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
