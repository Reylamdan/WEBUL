export interface AgendaCardProps {
  id: string;
  category: string;
  dateDay?: string;
  dateMonth?: string;
  title: string;
  description: string;
  meta: string;
}

export function AgendaCard({
  category,
  dateDay = "--",
  dateMonth = "BULAN",
  title,
  description,
  meta,
}: AgendaCardProps) {
  return (
    <article className="agenda-card">
      <div aria-hidden="true" className="agenda-card-image">
        <span className="agenda-placeholder-hint-small">Foto acara</span>
      </div>

      <div className="agenda-card-content">
        <div className="agenda-card-top">
          <div className="agenda-date-badge">
            <span className="agenda-date-day">{dateDay}</span>
            <span className="agenda-date-month">{dateMonth}</span>
          </div>

          <div className="agenda-card-title-group">
            <span className="agenda-card-category">{category}</span>
            <h3 className="agenda-card-title">{title}</h3>
          </div>
        </div>

        <p className="agenda-card-desc">{description}</p>

        <div className="agenda-card-meta">
          <span>{meta}</span>
        </div>
      </div>
    </article>
  );
}

