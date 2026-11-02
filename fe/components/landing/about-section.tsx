import { Icon } from "@/components/icons";

export function AboutSection() {
  return (
    <section className="intro-section content-wrap" id="tentang">
      <div className="intro-copy">
        <span className="eyebrow">TENTANG UNIVERSITAS LIA</span>
        <h2>Transformasi STIA LIA menjadi Universitas LIA</h2>
        <p className="section-lead">
          Perjalanan baru untuk menghadirkan pendidikan yang relevan,
          inklusif, dan siap menjawab kebutuhan masa depan.
        </p>
        <ul className="value-list">
          <li>
            <span>
              <Icon name="sparkle" size={17} />
            </span>
            <div>
              <strong>Pendidikan berkualitas</strong>
              <small>Belajar dari pengajar berpengalaman</small>
            </div>
          </li>
          <li>
            <span>
              <Icon name="globe" size={17} />
            </span>
            <div>
              <strong>Wawasan global</strong>
              <small>Bekal untuk berkiprah tanpa batas</small>
            </div>
          </li>
          <li>
            <span>
              <Icon name="graduate" size={17} />
            </span>
            <div>
              <strong>Siap menghadapi masa depan</strong>
              <small>Kompetensi yang relevan dengan industri</small>
            </div>
          </li>
        </ul>
        <a className="text-link" href="/profil/visi-misi">
          Tentang Universitas LIA <Icon name="arrow" size={16} />
        </a>
      </div>
      <div className="intro-media">
        <div className="intro-media-art">
          <span className="art-sun" />
          <span className="art-building art-building-one" />
          <span className="art-building art-building-two" />
          <span className="art-ground" />
          <span className="art-label">
            LEARNING
            <br />
            WITHOUT LIMITS
          </span>
        </div>
        <span className="media-caption">
          <Icon name="play" size={13} /> Cerita Universitas LIA
        </span>
      </div>
    </section>
  );
}
