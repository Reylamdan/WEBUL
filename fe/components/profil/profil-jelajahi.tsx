import { ProfilCard } from "./profil-card";

export function ProfilJelajahi() {
  const profileLinks = [
    {
      title: "Sejarah",
      description: "Perjalanan dan perkembangan institusi.",
      href: "/profil/sejarah",
    },
    {
      title: "Visi & Misi",
      description: "Arah dan komitmen universitas.",
      href: "/profil/visi-misi",
    },
    {
      title: "Struktur Organisasi",
      description: "Susunan organisasi dan tata kelola.",
      href: "/profil/struktur-organisasi",
    },
    {
      title: "Akreditasi",
      description: "Informasi akreditasi institusi dan program studi.",
      href: "/profil/akreditasi",
    },
    {
      title: "Fasilitas Kampus",
      description: "Ruang dan fasilitas pendukung kegiatan kampus.",
      href: "/profil/fasilitas-kampus",
    },
  ];

  return (
    <section aria-labelledby="jelajahi-title" className="profile-section profile-wrap" id="informasi">
      <div className="profile-section-header">
        <span className="profile-eyebrow">JELAJAHI PROFIL</span>
        <h2 className="profile-section-title" id="jelajahi-title">
          Informasi Universitas LIA
        </h2>
        <p className="profile-section-desc">
          Pilih bagian profil untuk melihat informasi lebih lanjut.
        </p>
      </div>

      <div className="profile-cards-grid">
        {profileLinks.map((item) => (
          <ProfilCard
            description={item.description}
            href={item.href}
            key={item.title}
            title={item.title}
          />
        ))}
      </div>

      <div className="profile-bottom-note">
        <hr className="profile-divider" />
        <p>Konten dan foto pendukung dapat ditambahkan setelah materi resmi tersedia.</p>
      </div>
    </section>
  );
}

