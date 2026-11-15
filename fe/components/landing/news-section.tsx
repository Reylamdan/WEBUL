"use client";

import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { errorMessage, formatDate, newsApi, type ContentLang, type NewsItem } from "@/lib/api";
import { useCoverLoadable } from "@/components/news-cover";
import { categoryLabel, useContentLang } from "@/lib/content-language";
import { newsDetailHref } from "@/lib/content-routes";
import { useApi } from "@/lib/use-api";
import { SectionHeading } from "./section-heading";

const NEWS_PAGE = "/kehidupan-kampus/berita-terkini";
const FALLBACK_IMAGES = ["story-art", "story-students", "story-language"];

function StoryCard({ story, index, lang }: { story: NewsItem; index: number; lang: ContentLang }) {
  // Cover dipakai sebagai background; bila gagal dimuat, kembali ke gambar dekoratif bawaan.
  const coverOk = useCoverLoadable(story.coverImageUrl);
  const href = newsDetailHref(story.slug);
  const tag = (story.category ? categoryLabel(story.category, lang) : "BERITA").toUpperCase();

  return (
    <article className="story-card">
      <a
        aria-label={`Baca ${story.title}`}
        className={`story-image ${coverOk ? "" : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}`}
        href={href}
        style={
          coverOk
            ? { backgroundImage: `url("${story.coverImageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <span className="story-image-tag">{tag}</span>
        <span className="story-image-decoration" />
      </a>
      <div className="story-meta">
        <span>{tag}</span>
        <time dateTime={story.publishedAt ?? undefined}>{formatDate(story.publishedAt, lang)}</time>
      </div>
      <h3>
        <a href={href}>{story.title}</a>
      </h3>
      <a className="story-read-more" href={href}>
        Baca selengkapnya <Icon name="arrow" size={15} />
      </a>
    </article>
  );
}

export function NewsSection() {
  const [lang] = useContentLang();
  const { data, error, loading } = useApi(`landing-news:${lang}`, () => newsApi.list({ page: 1, limit: 3, lang }));
  const stories = data?.items ?? [];

  return (
    <ScrollReveal delay={140}>
    <section className="news-section" id="kabar">
      <div className="content-wrap">
        <SectionHeading
          eyebrow="CERITA DARI KAMPUS"
          href={NEWS_PAGE}
          link="Semua kabar"
          title="Kabar dan inspirasi"
        />
        {error && !data ? (
          <p className="berita-empty-state" role="alert">{errorMessage(error)}</p>
        ) : loading && !data ? (
          <p className="berita-empty-state" aria-live="polite">Memuat berita...</p>
        ) : stories.length === 0 ? (
          <p className="berita-empty-state">Belum ada berita yang dipublikasikan.</p>
        ) : (
        <div className="story-grid">
          {stories.map((story, index) => (
            <ScrollReveal delay={(index % 4) * 70} key={story.id}>
              <StoryCard index={index} lang={lang} story={story} />
            </ScrollReveal>
          ))}
        </div>
        )}
      </div>
    </section>
    </ScrollReveal>
  );
}
