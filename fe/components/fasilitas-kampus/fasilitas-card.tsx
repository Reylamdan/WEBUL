export interface FasilitasCardProps {
  title: string;
  description: string;
  imageUrl?: string | null;
}

export function FasilitasCard({ title, description, imageUrl }: FasilitasCardProps) {
  return (
    <article className="fasilitas-card">
      <div className="fasilitas-card-image">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={title}
            className="fasilitas-card-img"
            decoding="async"
            loading="lazy"
            src={imageUrl}
          />
        ) : (
          <span className="fasilitas-image-placeholder-text">
            Foto fasilitas — isi nanti
          </span>
        )}
      </div>
      <div className="fasilitas-card-info">
        <h3 className="fasilitas-card-title">{title}</h3>
        <p className="fasilitas-card-desc">{description}</p>
      </div>
    </article>
  );
}
