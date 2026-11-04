export interface FasilitasCardProps {
  title: string;
  description: string;
}

export function FasilitasCard({ title, description }: FasilitasCardProps) {
  return (
    <article className="fasilitas-card">
      <div className="fasilitas-card-image">
        <span className="fasilitas-image-placeholder-text">
          Foto fasilitas — isi nanti
        </span>
      </div>
      <div className="fasilitas-card-info">
        <h3 className="fasilitas-card-title">{title}</h3>
        <p className="fasilitas-card-desc">{description}</p>
      </div>
    </article>
  );
}

