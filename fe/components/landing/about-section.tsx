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
    <ScrollReveal>
      <section className="lp-section lp-about" id="tentang">
        <div className="lp-wrap">
          <header className="lp-about-head">
            <div>
              <span className="lp-eyebrow">{content.eyebrow}</span>
              <h2>{content.title}</h2>
            </div>
            <p className="lp-lead">{content.lead}</p>
          </header>

          <div className="lp-about-body">
            <figure className="lp-about-media">
              <div
                className={`lp-about-photo${photoUrl ? " has-photo" : ""}`}
                style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
              >
                {photoUrl ? null : <span className="lp-photo-label">{content.mediaLabel}</span>}
              </div>
              {content.mediaCaption ? <figcaption>{content.mediaCaption}</figcaption> : null}
            </figure>

            <div className="lp-about-side">
              <ul className="lp-values">
                {content.values.map((value) => (
                  <li key={value.title}>
                    <span className="lp-values-icon">
                      <Icon name={value.icon} size={20} />
                    </span>
                    <div>
                      <strong>{value.title}</strong>
                      <p>{value.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
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
