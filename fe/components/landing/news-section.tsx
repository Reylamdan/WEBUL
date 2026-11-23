"use client";

import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { errorMessage, formatDate, newsApi, type ContentLang, type NewsItem } from "@/lib/api";
import { useCoverLoadable } from "@/components/news-cover";
import { categoryLabel, useContentLang } from "@/lib/content-language";
import { newsDetailHref } from "@/lib/content-routes";
import { useApi } from "@/lib/use-api";
import { SectionHeading } from "./section-heading";
import { SmartLink } from "@/components/smart-link";

const NEWS_PAGE = "/kehidupan-kampus/berita-terkini";

function Story({
  story,
  lang,
  variant,
}: {
  story: NewsItem;
  lang: ContentLang;
  variant: "featured" | "compact";
}) {
  // Cover dipakai sebagai background; bila gagal dimuat, tampilkan blok netral dengan ikon.
  const coverOk = useCoverLoadable(story.coverImageUrl);
  const href = newsDetailHref(story.slug);
  const tag = (story.category ? categoryLabel(story.category, lang) : "BERITA").toUpperCase();

  return (
    <article className={`lp-story is-${variant}`}>
      <SmartLink
        aria-label={`Baca ${story.title}`}
        className="lp-story-media"
        href={href}
        style={
          coverOk
            ? { backgroundImage: `url("${story.coverImageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {coverOk ? null : <Icon className="lp-media-icon" name="book" size={34} />}
      </SmartLink>
      <div className="lp-story-body">
        <div className="lp-story-meta">
          <span className="lp-story-tag">{tag}</span>
          <time dateTime={story.publishedAt ?? undefined}>{formatDate(story.publishedAt, lang)}</time>
        </div>
        <h3>
          <SmartLink href={href}>{story.title}</SmartLink>
        </h3>
        {variant === "featured" ? (
          <SmartLink className="lp-link" href={href}>
            Baca selengkapnya <Icon name="arrow" size={16} />
          </SmartLink>
        ) : null}
      </div>
    </article>
  );
}

export function NewsSection() {
  const [lang] = useContentLang();
  const { data, error, loading } = useApi(`landing-news:${lang}`, () => newsApi.list({ page: 1, limit: 3, lang }));
  const stories = data?.items ?? [];
  const [featured, ...rest] = stories;

  return (
    <ScrollReveal>
      <section className="lp-section lp-news" id="kabar">
        <div className="lp-wrap">
          <SectionHeading
            eyebrow="CERITA DARI KAMPUS"
            href={NEWS_PAGE}
            link="Semua kabar"
            title="Kabar dan inspirasi"
          />
          {error && !data ? (
            <p className="lp-empty" role="alert">{errorMessage(error)}</p>
          ) : loading && !data ? (
            <p aria-live="polite" className="lp-empty">Memuat berita...</p>
          ) : !featured ? (
            <p className="lp-empty">Belum ada berita yang dipublikasikan.</p>
          ) : (
            <div className={`lp-news-grid${rest.length === 0 ? " is-single" : ""}`}>
              <Story lang={lang} story={featured} variant="featured" />
              {rest.length > 0 ? (
                <div className="lp-news-side">
                  {rest.map((story) => (
                    <Story key={story.id} lang={lang} story={story} variant="compact" />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </ScrollReveal>
  );
}
