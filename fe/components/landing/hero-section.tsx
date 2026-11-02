import { Icon } from "@/components/icons";

export function HeroSection({ onPlayVideo }: { onPlayVideo: () => void }) {
  return (
    <section aria-labelledby="hero-title" className="hero">
      <div className="hero-backdrop">
        <div className="hero-shape hero-shape-one" />
        <div className="hero-shape hero-shape-two" />
        <span className="hero-image-note">KAMPUS UNIVERSITAS LIA · VIDEO PREVIEW</span>
        <button
          aria-label="Putar video kampus"
          className="hero-play"
          onClick={onPlayVideo}
          type="button"
        >
          <Icon name="play" size={22} />
        </button>
        <span className="hero-caption">Tempat ide tumbuh dan masa depan dimulai</span>
      </div>
      <div className="hero-content">
        <span className="eyebrow eyebrow-light">UNIVERSITAS LIA</span>
        <h1 id="hero-title">
          Empowering Minds,
          <br />
          Inspiring Futures.
        </h1>
        <p>
          Belajar bahasa, teknologi, dan bisnis bersama komunitas yang
          mendukungmu tumbuh dan siap menghadapi dunia.
        </p>
        <div className="hero-actions">
          <a className="button button-light" href="#program">
            Temukan program studi <Icon name="arrow" size={16} />
          </a>
          <a className="hero-secondary-link" href="/profil">
            Kenali Universitas LIA
          </a>
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
  );
}
