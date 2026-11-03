export function UnitPimpinan() {
  const units = [
    { title: "Pimpinan Universitas" },
    { title: "Unit dan Bagian" },
    { title: "Organ pendukung" },
  ];

  return (
    <section aria-labelledby="unit-title" className="struktur-section struktur-wrap">
      <div className="struktur-section-header">
        <span className="struktur-eyebrow">INFORMASI ORGANISASI</span>
        <h2 className="struktur-section-title" id="unit-title">
          Unit dan Pimpinan
        </h2>
        <p className="struktur-section-desc">
          Informasi nama, jabatan, dan unit kerja dapat ditambahkan setelah susunan resmi dikonfirmasi.
        </p>
      </div>

      <div className="unit-cards-grid">
        {units.map((unit) => (
          <article className="unit-card" key={unit.title}>
            <div className="unit-card-accent" />
            <div className="unit-card-body">
              <h3 className="unit-card-title">{unit.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

