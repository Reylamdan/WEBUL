"use client";

import Link from "next/link";
import { NewsCover } from "@/components/news-cover";
import { formatDate, newsApi } from "@/lib/api";
import { useContentLang } from "@/lib/content-language";
import { newsDetailHref } from "@/lib/content-routes";
import { useApi } from "@/lib/use-api";

// Daftar yang sama dipakai oleh Sorotan dan Berita lainnya (permintaan digabung oleh lib/api).
export const BERITA_FEATURED_PARAMS = { page: 1, limit: 4 } as const;

export function BeritaSorotan() {
  const [lang] = useContentLang();
  const { data } = useApi(`berita-featured:${lang}`, () => newsApi.list({ ...BERITA_FEATURED_PARAMS, lang }));
  const item = data?.items[0];

  // Tanpa berita (memuat, kosong, atau gagal) bagian sorotan tidak ditampilkan;
  // status kosong/galat ditampilkan oleh bagian "Jelajahi berita".
  if (!item) return null;

  const meta = [formatDate(item.publishedAt, lang), item.author?.name].filter(Boolean).join(" · ");

  return (
    <section aria-label="Sorotan Kampus" className="berita-sorotan-section berita-wrap">
      <article className="berita-sorotan-card">
        <div aria-hidden="true" className="berita-sorotan-image">
          <NewsCover fallback={<span className="berita-placeholder-hint">Foto berita utama</span>} src={item.coverImageUrl} />
        </div>

        <div className="berita-sorotan-content">
          <span className="berita-card-eyebrow">SOROTAN KAMPUS</span>
          <h2 className="berita-sorotan-title">
            <Link href={newsDetailHref(item.slug)}>{item.title}</Link>
          </h2>
          {item.excerpt && <p className="berita-sorotan-desc">{item.excerpt}</p>}
          <div className="berita-sorotan-meta">
            <span>{meta}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
