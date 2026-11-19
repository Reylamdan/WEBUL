import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export function HeroSection({
  onPlayVideo,
  content,
  photoUrl,
}: {
  onPlayVideo: () => void;
  content: HomepageContent["hero"];
  photoUrl?: string | null;
}) {
  return (
    <ScrollReveal delay={70}>
    <section aria-labelledby="hero-title" className="hero">
      <div
        className={`hero-backdrop${photoUrl ? " has-photo" : ""}`}
        style={
          photoUrl
            ? {
                backgroundImage: `linear-gradient(90deg, #183b46aa, transparent 62%), url("${photoUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="hero-shape hero-shape-one" />
        <div className="hero-shape hero-shape-two" />
        {content.imageNote ? <span className="hero-image-note">{content.imageNote}</span> : null}
        <button
          aria-label="Putar video kampus"
          className="hero-play"
          onClick={onPlayVideo}
          type="button"
        >
          <Icon name="play" size={22} />
        </button>
        {content.caption ? <span className="hero-caption">{content.caption}</span> : null}
      </div>
      <div className="hero-content">
        <span className="eyebrow eyebrow-light">{content.eyebrow}</span>
        <h1 id="hero-title">
          {content.titleLine1}
          {content.titleLine2 ? (
            <>
              <br />
              {content.titleLine2}
            </>
          ) : null}
        </h1>
        <p>{content.description}</p>
        <div className="hero-actions">
          <SmartLink className="button button-light" href={content.primaryHref}>
            {content.primaryLabel} <Icon name="arrow" size={16} />
          </SmartLink>
          <SmartLink className="hero-secondary-link" href={content.secondaryHref}>
            {content.secondaryLabel}
          </SmartLink>
        </div>
      </div>
      <div className="hero-pagination">
        <span className="pagination-active" />
        <span />
        <span />
        <small>
          01 <i>/</i> 03
        </small>
      </div>
    </section>
    </ScrollReveal>
  );
}
