import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export function AboutSection({
  content,
  photoUrl,
}: {
  content: HomepageContent["about"];
  photoUrl?: string | null;
}) {
  return (
    <ScrollReveal delay={140}>
    <section className="intro-section content-wrap" id="tentang">
      <div className="intro-copy">
        <span className="eyebrow">{content.eyebrow}</span>
        <h2>{content.title}</h2>
        <p className="section-lead">{content.lead}</p>
        <ul className="value-list">
          {content.values.map((value) => (
            <li key={value.title}>
              <span>
                <Icon name={value.icon} size={17} />
              </span>
              <div>
                <strong>{value.title}</strong>
                <small>{value.description}</small>
              </div>
            </li>
          ))}
        </ul>
        <SmartLink className="text-link" href={content.linkHref}>
          {content.linkLabel} <Icon name="arrow" size={16} />
        </SmartLink>
      </div>
      <div className="intro-media">
        <div
          className="intro-media-art"
          style={
            photoUrl
              ? { backgroundImage: `url("${photoUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {photoUrl ? null : (
            <>
              <span className="art-sun" />
              <span className="art-building art-building-one" />
              <span className="art-building art-building-two" />
              <span className="art-ground" />
              <span className="art-label">{content.mediaLabel}</span>
            </>
          )}
        </div>
        {content.mediaCaption ? (
          <span className="media-caption">
            <Icon name="play" size={13} /> {content.mediaCaption}
          </span>
        ) : null}
      </div>
    </section>
    </ScrollReveal>
  );
}
