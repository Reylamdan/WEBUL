"use client";

import { ContentModal } from "@/components/content-modal";
import { NewsCover } from "@/components/news-cover";
import { errorMessage, formatDate, newsApi } from "@/lib/api";
import { useContentLang } from "@/lib/content-language";
import { useDetailParam } from "@/lib/use-detail-param";
import { useApi } from "@/lib/use-api";

function NewsDetail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [lang] = useContentLang();
  const { data, error, loading } = useApi(`berita-detail:${lang}:${slug}`, () => newsApi.detail(slug, lang));

  const meta = data
    ? [formatDate(data.publishedAt, lang), data.author?.name, lang === "en" && data.translated === false ? "Indonesian only" : ""]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <ContentModal date={meta} eyebrow="BERITA" onClose={onClose} title={data?.title ?? (error ? "Berita tidak tersedia" : "Memuat berita...")}>
      {loading ? (
        <p aria-live="polite" className="pengumuman-modal-desc">
          Memuat berita...
        </p>
      ) : error ? (
        <p className="pengumuman-modal-desc" role="alert">
          {errorMessage(error)}
        </p>
      ) : data ? (
        <>
          <NewsCover alt={data.title} className="news-modal-cover" fallback={null} src={data.coverImageUrl} />
          {data.excerpt && <p className="pengumuman-modal-desc">{data.excerpt}</p>}
          {data.contentHtml && (
            <div
              className="pengumuman-modal-detail-box"
              // Isi berita sudah disanitasi oleh backend (sanitize-html) sebelum disimpan.
              dangerouslySetInnerHTML={{ __html: data.contentHtml }}
            />
          )}
        </>
      ) : null}
    </ContentModal>
  );
}

// Membuka detail berita bila URL memuat ?baca=<slug>. Dipasang sekali pada halaman daftar berita.
export function BeritaDetailModal() {
  const { slug, close } = useDetailParam();
  if (!slug) return null;
  return <NewsDetail key={slug} onClose={close} slug={slug} />;
}
