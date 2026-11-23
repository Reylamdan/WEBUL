import { Icon } from "@/components/icons";
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
    <section aria-labelledby="hero-title" className="lp-hero">
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">{content.eyebrow}</span>
          <h1 id="hero-title">
            <span>{content.titleLine1}</span>
            {content.titleLine2 ? <span className="lp-hero-accent">{content.titleLine2}</span> : null}
          </h1>
          <p>{content.description}</p>
          <div className="lp-hero-actions">
            <SmartLink className="lp-btn lp-btn-primary" href={content.primaryHref}>
              {content.primaryLabel} <Icon name="arrow" size={16} />
            </SmartLink>
            <SmartLink className="lp-link lp-link-quiet" href={content.secondaryHref}>
              {content.secondaryLabel}
            </SmartLink>
          </div>
        </div>

        <figure className="lp-hero-media">
          <div
            className={`lp-hero-photo${photoUrl ? " has-photo" : ""}`}
            style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
          >
            <button
              aria-label="Putar video kampus"
              className="lp-play"
              onClick={onPlayVideo}
              type="button"
            >
              <span className="lp-play-icon">
                <Icon name="play" size={15} />
              </span>
              <span>Tonton video kampus</span>
            </button>
          </div>
          {content.caption || content.imageNote ? (
            <figcaption>
              <span>{content.caption}</span>
              {content.imageNote ? <span className="lp-hero-note">{content.imageNote}</span> : null}
            </figcaption>
          ) : null}
        </figure>
      </div>
    </section>
  );
}
