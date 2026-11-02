import { VisiCard } from "./visi-card";

export function KomitmenKami() {
  const items = [
    {
      title: "Pendidikan",
      description: "Komitmen terhadap mutu pembelajaran.",
    },
    {
      title: "Pengembangan",
      description: "Dukungan terhadap kompetensi dan potensi mahasiswa.",
    },
    {
      title: "Kolaborasi",
      description: "Mendorong kerja sama dan lingkungan akademik yang terbuka.",
    },
  ];

  return (
    <section aria-labelledby="komitmen-title" className="visi-section visi-wrap">
      <div className="visi-section-header">
        <span className="visi-eyebrow">NILAI INSTITUSI</span>
        <h2 className="visi-section-title" id="komitmen-title">
          Komitmen Kami
        </h2>
        <p className="visi-section-desc">
          Area untuk menjelaskan nilai, prinsip, dan fokus pengembangan universitas.
        </p>
      </div>

      <div className="visi-grid-3">
        {items.map((item) => (
          <VisiCard
            description={item.description}
            key={item.title}
            title={item.title}
          />
        ))}
      </div>
    </section>
  );
}
