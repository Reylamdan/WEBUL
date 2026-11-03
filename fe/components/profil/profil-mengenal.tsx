export function ProfilMengenal() {
  return (
    <section aria-labelledby="mengenal-title" className="profile-section profile-wrap">
      <div className="profile-mengenal-grid">
        <div className="profile-mengenal-copy">
          <span className="profile-eyebrow">TENTANG KAMI</span>
          <h2 className="profile-section-title" id="mengenal-title">
            Mengenal Universitas LIA
          </h2>
          <p className="profile-lead">
            Informasi ringkas mengenai identitas, perjalanan, dan komitmen Universitas LIA.
          </p>
          <p className="profile-body-text">
            Universitas LIA berkomitmen menghadirkan pengalaman pendidikan yang relevan, kolaboratif, dan berorientasi pada pengembangan kompetensi. Bagian ini dapat dilengkapi dengan profil resmi, nilai institusi, serta informasi utama universitas.
          </p>
        </div>

        <div className="profile-mengenal-visual">
          <div aria-hidden="true" className="profile-placeholder-box" />
        </div>
      </div>
    </section>
  );
}

