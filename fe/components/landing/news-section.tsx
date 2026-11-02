import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "./section-heading";

export interface StoryItem {
  tag: string;
  title: string;
  date: string;
  image: string;
  href?: string;
}

const defaultStories: StoryItem[] = [
  {
    tag: "KABAR KAMPUS",
    title: "Kreativitas mahasiswa hadir di ruang kolaborasi kampus",
    date: "12 Juni 2025",
    image: "story-art",
    href: "#kehidupan",
  },
  {
    tag: "PRESTASI",
    title: "Mahasiswa Universitas LIA raih prestasi di tingkat nasional",
    date: "8 Juni 2025",
    image: "story-students",
    href: "#kehidupan",
  },
  {
    tag: "KEGIATAN",
    title: "Belajar bahasa dan budaya melalui pengalaman langsung",
    date: "2 Juni 2025",
    image: "story-language",
    href: "#kehidupan",
  },
];

export function NewsSection({ stories = defaultStories }: { stories?: StoryItem[] }) {
  return (
    <ScrollReveal delay={140}>
    <section className="news-section" id="kabar">
      <div className="content-wrap">
        <SectionHeading
          eyebrow="CERITA DARI KAMPUS"
          link="Semua kabar"
          title="Kabar dan inspirasi"
        />
        <div className="story-grid">
          {stories.map((story, index) => (
            <ScrollReveal delay={(index % 4) * 70} key={story.title}>
            <article className="story-card">
              <a
                aria-label={`Baca ${story.title}`}
                className={`story-image ${story.image}`}
                href={story.href ?? "#kehidupan"}
              >
                <span className="story-image-tag">{story.tag}</span>
                <span className="story-image-decoration" />
              </a>
              <div className="story-meta">
                <span>{story.tag}</span>
                <time>{story.date}</time>
              </div>
              <h3>
                <a href={story.href ?? "#kehidupan"}>{story.title}</a>
              </h3>
              <a className="story-read-more" href={story.href ?? "#kehidupan"}>
                Baca selengkapnya <Icon name="arrow" size={15} />
              </a>
            </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
    </ScrollReveal>
  );
}
