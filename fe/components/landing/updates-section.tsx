"use client";

import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { announcementApi, calendarApi, dateParts, errorMessage, todayIso } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { SectionHeading } from "./section-heading";

const ANNOUNCEMENT_PAGE = "/kehidupan-kampus/pengumuman";
const AGENDA_PAGE = "/kehidupan-kampus/agenda-acara";

function UpdateItem({ category, date, href, title }: { category: string; date: string | null; href: string; title: string }) {
  const { day, month } = dateParts(date);
  return (
    <a className="update-item" href={href}>
      <span className="update-date">
        <strong>{day}</strong>
        <small>{month}</small>
      </span>
      <span className="update-copy">
        <small>{category}</small>
        <strong>{title}</strong>
      </span>
      <Icon name="arrow" size={17} />
    </a>
  );
}

export function UpdatesSection() {
  const announcements = useApi("landing-announcements", () => announcementApi.list({ page: 1, limit: 2 }));
  const events = useApi("landing-agenda", () => calendarApi.list({ page: 1, limit: 2, from: todayIso() }));

  return (
    <ScrollReveal delay={140}>
    <section className="updates-section content-wrap">
      <div className="update-column">
        <SectionHeading href={ANNOUNCEMENT_PAGE} link="Lihat semua" title="Pengumuman" />
        {announcements.error && !announcements.data ? (
          <p role="alert">{errorMessage(announcements.error)}</p>
        ) : announcements.loading && !announcements.data ? (
          <p aria-live="polite">Memuat pengumuman...</p>
        ) : announcements.data?.items.length === 0 ? (
          <p>Belum ada pengumuman.</p>
        ) : (
          announcements.data?.items.map((item) => (
            <UpdateItem category="PENGUMUMAN" date={item.publishedAt} href={ANNOUNCEMENT_PAGE} key={item.id} title={item.title} />
          ))
        )}
      </div>
      <div className="update-column">
        <SectionHeading link="Lihat semua" title="Agenda kampus" />
        {events.error && !events.data ? (
          <p role="alert">{errorMessage(events.error)}</p>
        ) : events.loading && !events.data ? (
          <p aria-live="polite">Memuat agenda...</p>
        ) : events.data?.items.length === 0 ? (
          <p>Belum ada agenda mendatang.</p>
        ) : (
          events.data?.items.map((item) => (
            <UpdateItem category={item.category.name.toUpperCase()} date={item.startDate} href={AGENDA_PAGE} key={item.id} title={item.title} />
          ))
        )}
      </div>
    </section>
    </ScrollReveal>
  );
}
