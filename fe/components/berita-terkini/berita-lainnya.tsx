"use client";

import { formatDate, newsApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { BERITA_FEATURED_PARAMS } from "./berita-sorotan";

export function BeritaLainnya() {
  const { data } = useApi("berita-featured", () => newsApi.list(BERITA_FEATURED_PARAMS));
  // Berita pertama sudah tampil sebagai sorotan.
  const items = data?.items.slice(1) ?? [];

  if (items.length === 0) return null;

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
        {items.map((item) => (
          <article className="berita-list-item" key={item.id}>
            <div aria-hidden="true" className="berita-list-thumbnail">
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" loading="lazy" src={item.coverImageUrl} />
              ) : (
                <span className="berita-placeholder-hint-small">Foto</span>
              )}
            </div>

            <div className="berita-list-content">
              <span className="berita-card-eyebrow">BERITA</span>
              <h3 className="berita-list-title">{item.title}</h3>
              <div className="berita-list-meta">
                <span>{[formatDate(item.publishedAt), item.excerpt].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
