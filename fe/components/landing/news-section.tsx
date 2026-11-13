"use client";

import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { errorMessage, formatDate, newsApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { SectionHeading } from "./section-heading";

const NEWS_PAGE = "/kehidupan-kampus/berita-terkini";
const FALLBACK_IMAGES = ["story-art", "story-students", "story-language"];

export function NewsSection() {
  const { data, error, loading } = useApi("landing-news", () => newsApi.list({ page: 1, limit: 3 }));
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
            <article className="story-card">
              <a
                aria-label={`Baca ${story.title}`}
                className={`story-image ${story.coverImageUrl ? "" : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}`}
                href={NEWS_PAGE}
                style={
                  story.coverImageUrl
                    ? { backgroundImage: `url("${story.coverImageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              >
                <span className="story-image-tag">BERITA</span>
                <span className="story-image-decoration" />
              </a>
              <div className="story-meta">
                <span>BERITA</span>
                <time dateTime={story.publishedAt ?? undefined}>{formatDate(story.publishedAt)}</time>
              </div>
              <h3>
                <a href={NEWS_PAGE}>{story.title}</a>
              </h3>
              <a className="story-read-more" href={NEWS_PAGE}>
                Baca selengkapnya <Icon name="arrow" size={15} />
              </a>
            </article>
            </ScrollReveal>
          ))}
        </div>
        )}
      </div>
    </section>
    </ScrollReveal>
  );
}
