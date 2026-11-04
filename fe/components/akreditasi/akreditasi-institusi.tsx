export function AkreditasiInstitusi() {
  return (
    <section aria-labelledby="institusi-title" className="akreditasi-section akreditasi-wrap">
      <div className="akreditasi-section-header">
        <span className="akreditasi-eyebrow">MUTU AKADEMIK</span>
        <h2 className="akreditasi-section-title" id="institusi-title">
          Akreditasi Institusi
        </h2>
        <p className="akreditasi-section-desc">
          Dokumen dan status akreditasi akan diisi berdasarkan informasi resmi yang berlaku.
        </p>
      </div>

      <div className="akreditasi-institusi-grid">
        <article className="akreditasi-card">
          <div className="akreditasi-card-accent" />
          <div className="akreditasi-card-body">
            <h3 className="akreditasi-card-title">Akreditasi Institusi</h3>
            <p className="akreditasi-card-desc">
              Status, nomor keputusan, lembaga, dan masa berlaku akan ditambahkan.
            </p>
          </div>
        </article>

        <div aria-hidden="true" className="akreditasi-placeholder-box akreditasi-institusi-placeholder" />
      </div>
    </section>
  );
}

