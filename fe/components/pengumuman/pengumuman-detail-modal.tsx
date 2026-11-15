"use client";

import { ContentModal } from "@/components/content-modal";
import { announcementApi, errorMessage, formatDate } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useContentLang } from "@/lib/content-language";
import { useDetailParam } from "@/lib/use-detail-param";

function AnnouncementDeepLink({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [lang] = useContentLang();
  const { data, error, loading } = useApi(`pengumuman-deeplink:${lang}:${slug}`, () => announcementApi.detail(slug, lang));

  return (
    <ContentModal
      date={data ? formatDate(data.publishedAt, lang) : undefined}
      eyebrow="PENGUMUMAN"
      onClose={onClose}
      title={data?.title ?? (error ? "Pengumuman tidak tersedia" : "Memuat pengumuman...")}
    >
      {loading ? (
        <p aria-live="polite" className="pengumuman-modal-desc">
          Memuat pengumuman...
        </p>
      ) : error ? (
        <p className="pengumuman-modal-desc" role="alert">
          {errorMessage(error)}
        </p>
      ) : data ? (
        <>
          {data.excerpt && <p className="pengumuman-modal-desc">{data.excerpt}</p>}
          {data.contentHtml && (
            <div
              className="pengumuman-modal-detail-box"
              // Isi pengumuman sudah disanitasi oleh backend (sanitize-html) sebelum disimpan.
              dangerouslySetInnerHTML={{ __html: data.contentHtml }}
            />
          )}
        </>
      ) : null}
    </ContentModal>
  );
}

// Membuka detail pengumuman bila URL memuat ?baca=<slug> (mis. dari hasil pencarian, beranda, atau sitasi asisten).
export function PengumumanDetailModal() {
  const { slug, close } = useDetailParam();
  if (!slug) return null;
  return <AnnouncementDeepLink key={slug} onClose={close} slug={slug} />;
}
