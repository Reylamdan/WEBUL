export function BeritaSorotan() {
  return (
    <section aria-label="Sorotan Kampus" className="berita-sorotan-section berita-wrap">
      <article className="berita-sorotan-card">
        <div aria-hidden="true" className="berita-sorotan-image">
          <span className="berita-placeholder-hint">Foto berita utama — isi nanti</span>
        </div>

        <div className="berita-sorotan-content">
          <span className="berita-card-eyebrow">SOROTAN KAMPUS</span>
          <h2 className="berita-sorotan-title">
            Cerita dan perkembangan terbaru dari Universitas LIA
          </h2>
          <p className="berita-sorotan-desc">
            Area ini disiapkan untuk berita utama, ringkasan artikel, tanggal terbit, dan tautan baca selengkapnya.
          </p>
          <div className="berita-sorotan-meta">
            <span>Tanggal publikasi · Kategori berita</span>
          </div>
        </div>
      </article>
    </section>
  );
}

