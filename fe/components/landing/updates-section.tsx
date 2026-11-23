"use client";

import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { agendaApi, announcementApi, dateParts, errorMessage, todayIso } from "@/lib/api";
import { announcementDetailHref } from "@/lib/content-routes";
import { useContentLang } from "@/lib/content-language";
import { useApi } from "@/lib/use-api";
import { SectionHeading } from "./section-heading";
import { SmartLink } from "@/components/smart-link";

const ANNOUNCEMENT_PAGE = "/kehidupan-kampus/pengumuman";
const AGENDA_PAGE = "/kehidupan-kampus/agenda-acara";

function UpdateItem({
  category,
  date,
  href,
  title,
}: {
  category: string;
  date: string | null;
  href: string;
  title: string;
}) {
  const { day, month } = dateParts(date);
  return (
    <SmartLink className="lp-update" href={href}>
      <span className="lp-update-date">
        <strong>{day}</strong>
        <small>{month}</small>
      </span>
      <span className="lp-update-copy">
        <small>{category}</small>
        <strong>{title}</strong>
      </span>
      <Icon name="arrow" size={17} />
    </SmartLink>
  );
}

export function UpdatesSection() {
  const [lang] = useContentLang();
  const announcements = useApi(`landing-announcements:${lang}`, () =>
    announcementApi.list({ page: 1, limit: 2, lang }),
  );
  const events = useApi("landing-agenda", () => agendaApi.list({ page: 1, limit: 2, from: todayIso() }));

  return (
    <ScrollReveal>
      <section className="lp-section lp-updates">
        <div className="lp-wrap lp-updates-grid">
          <div className="lp-panel lp-announcements">
            <SectionHeading href={ANNOUNCEMENT_PAGE} link="Lihat semua" title="Pengumuman" />
            {announcements.error && !announcements.data ? (
              <p className="lp-empty" role="alert">{errorMessage(announcements.error)}</p>
            ) : announcements.loading && !announcements.data ? (
              <p aria-live="polite" className="lp-empty">Memuat pengumuman...</p>
            ) : announcements.data?.items.length === 0 ? (
              <p className="lp-empty">Belum ada pengumuman.</p>
            ) : (
              announcements.data?.items.map((item) => (
                <UpdateItem
                  category="PENGUMUMAN"
                  date={item.publishedAt}
                  href={announcementDetailHref(item.slug)}
                  key={item.id}
                  title={item.title}
                />
              ))
            )}
          </div>

          <aside aria-label="Agenda kampus" className="lp-panel lp-agenda">
            <SectionHeading href={AGENDA_PAGE} link="Lihat semua" title="Agenda kampus" />
            {events.error && !events.data ? (
              <p className="lp-empty" role="alert">{errorMessage(events.error)}</p>
            ) : events.loading && !events.data ? (
              <p aria-live="polite" className="lp-empty">Memuat agenda...</p>
            ) : events.data?.items.length === 0 ? (
              <p className="lp-empty">Belum ada agenda mendatang.</p>
            ) : (
              events.data?.items.map((item) => (
                <UpdateItem
                  category={item.category.name.toUpperCase()}
                  date={item.startDate}
                  href={AGENDA_PAGE}
                  key={item.id}
                  title={item.title}
                />
              ))
            )}
          </aside>
        </div>
      </section>
    </ScrollReveal>
  );
}
