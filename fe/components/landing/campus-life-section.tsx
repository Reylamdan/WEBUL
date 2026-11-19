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
    <ScrollReveal delay={210}>
    <section className="campus-life-section content-wrap" id="kehidupan">
      <div
        className={`campus-life-image${photoUrl ? " has-photo" : ""}`}
        style={
          photoUrl
            ? { backgroundImage: `url("${photoUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {photoUrl ? null : (
          <>
            <span className="life-art-person life-person-one" />
            <span className="life-art-person life-person-two" />
            <span className="life-art-table" />
          </>
        )}
        {content.photoLabel ? <span className="life-photo-label">{content.photoLabel}</span> : null}
      </div>
      <div className="campus-life-copy">
        <span className="eyebrow">{content.eyebrow}</span>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        <SmartLink className="text-link" href={content.linkHref}>
          {content.linkLabel} <Icon name="arrow" size={16} />
        </SmartLink>
      </div>
    </section>
    </ScrollReveal>
  );
}
