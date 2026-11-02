import { VisiCard } from "./visi-card";

export function LandasanTujuan() {
  const items = [
    {
      title: "Visi",
      description: "Pernyataan visi resmi Universitas LIA akan ditempatkan di sini.",
    },
    {
      title: "Misi",
      description: "Pernyataan misi resmi Universitas LIA akan ditempatkan di sini.",
    },
  ];

  return (
    <section aria-labelledby="landasan-title" className="visi-section visi-wrap">
      <div className="visi-section-header">
        <span className="visi-eyebrow">ARAH INSTITUSI</span>
        <h2 className="visi-section-title" id="landasan-title">
          Landasan dan Tujuan
        </h2>
        <p className="visi-section-desc">
          Visi dan misi menjadi acuan dalam pengembangan pendidikan, layanan, dan tata kelola universitas.
        </p>
      </div>

      <div className="visi-grid-2">
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
