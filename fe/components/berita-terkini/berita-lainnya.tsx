"use client";

import Link from "next/link";
import { NewsCover } from "@/components/news-cover";
import { formatDate, newsApi } from "@/lib/api";
import { useContentLang } from "@/lib/content-language";
import { newsDetailHref } from "@/lib/content-routes";
import { useApi } from "@/lib/use-api";
import { BERITA_FEATURED_PARAMS } from "./berita-sorotan";

export function BeritaLainnya() {
  const [lang] = useContentLang();
  const { data } = useApi(`berita-featured:${lang}`, () => newsApi.list({ ...BERITA_FEATURED_PARAMS, lang }));
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
              <NewsCover fallback={<span className="berita-placeholder-hint-small">Foto</span>} src={item.coverImageUrl} />
            </div>

            <div className="berita-list-content">
              <span className="berita-card-eyebrow">BERITA</span>
              <h3 className="berita-list-title">
                <Link href={newsDetailHref(item.slug)}>{item.title}</Link>
              </h3>
              <div className="berita-list-meta">
                <span>{[formatDate(item.publishedAt, lang), item.excerpt].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
