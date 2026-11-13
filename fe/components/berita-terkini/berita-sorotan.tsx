"use client";

import { formatDate, newsApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

// Daftar yang sama dipakai oleh Sorotan dan Berita lainnya (permintaan digabung oleh lib/api).
export const BERITA_FEATURED_PARAMS = { page: 1, limit: 4 } as const;

export function BeritaSorotan() {
  const { data } = useApi("berita-featured", () => newsApi.list(BERITA_FEATURED_PARAMS));
  const item = data?.items[0];

  // Tanpa berita (memuat, kosong, atau gagal) bagian sorotan tidak ditampilkan;
  // status kosong/galat ditampilkan oleh bagian "Jelajahi berita".
  if (!item) return null;

  const meta = [formatDate(item.publishedAt), item.author?.name].filter(Boolean).join(" · ");

  return (
    <section aria-label="Sorotan Kampus" className="berita-sorotan-section berita-wrap">
      <article className="berita-sorotan-card">
        <div aria-hidden="true" className="berita-sorotan-image">
          {item.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" loading="lazy" src={item.coverImageUrl} />
          ) : (
            <span className="berita-placeholder-hint">Foto berita utama</span>
          )}
        </div>

        <div className="berita-sorotan-content">
          <span className="berita-card-eyebrow">SOROTAN KAMPUS</span>
          <h2 className="berita-sorotan-title">{item.title}</h2>
          {item.excerpt && <p className="berita-sorotan-desc">{item.excerpt}</p>}
          <div className="berita-sorotan-meta">
            <span>{meta}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
