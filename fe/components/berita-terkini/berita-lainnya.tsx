interface BeritaLainnyaItem {
  id: string;
  category: string;
  title: string;
  meta: string;
}

const BERITA_LAINNYA: BeritaLainnyaItem[] = [
  {
    id: "kegiatan-1",
    category: "KEGIATAN",
    title: "Sorotan kegiatan mahasiswa",
    meta: "Tanggal publikasi · Ringkasan berita akan ditambahkan",
  },
  {
    id: "prestasi-1",
    category: "PRESTASI",
    title: "Cerita kolaborasi dan prestasi",
    meta: "Tanggal publikasi · Ringkasan berita akan ditambahkan",
  },
  {
    id: "informasi-1",
    category: "INFORMASI",
    title: "Kabar terbaru Universitas LIA",
    meta: "Tanggal publikasi · Ringkasan berita akan ditambahkan",
  },
];

export function BeritaLainnya() {
  return (
    <section aria-labelledby="berita-lainnya-title" className="berita-lainnya-section berita-wrap">
      <div className="berita-section-header">
        <h2 className="berita-section-title" id="berita-lainnya-title">
          Berita lainnya
        </h2>
        <p className="berita-section-desc">
          Daftar berita terbaru dapat ditambahkan dan diperbarui melalui pengelolaan konten.
        </p>
      </div>

      <div className="berita-list">
        {BERITA_LAINNYA.map((item) => (
          <article className="berita-list-item" key={item.id}>
            <div aria-hidden="true" className="berita-list-thumbnail">
              <span className="berita-placeholder-hint-small">Foto</span>
            </div>

            <div className="berita-list-content">
              <span className="berita-card-eyebrow">{item.category}</span>
              <h3 className="berita-list-title">{item.title}</h3>
              <div className="berita-list-meta">
                <span>{item.meta}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

