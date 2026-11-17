export interface AgendaCardProps {
  id: string;
  category: string;
  dateDay?: string;
  dateMonth?: string;
  title: string;
  description: string;
  meta: string;
  organizer?: string | null;
  registrationUrl?: string | null;
  // Opsional: tanpa gambar kartu tampil dengan desain ringkas tanpa blok foto.
  imageUrl?: string | null;
}

export function AgendaCard({
  category,
  dateDay = "--",
  dateMonth = "BULAN",
  title,
  description,
  meta,
  organizer,
  registrationUrl,
  imageUrl,
  id: _id,
}: AgendaCardProps) {
  return (
    <article className={`agenda-card ${imageUrl ? "has-image" : "no-image"}`}>
      {imageUrl && (
        <div className="agenda-card-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={title} decoding="async" loading="lazy" src={imageUrl} />
        </div>
      )}

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

        {description && <p className="agenda-card-desc">{description}</p>}

        <div className="agenda-card-meta">
          <span>{meta}</span>
          {organizer && <span> · {organizer}</span>}
          {registrationUrl && (
            <>
              {" · "}
              <a href={registrationUrl} rel="noopener noreferrer" target="_blank">
                Daftar
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}