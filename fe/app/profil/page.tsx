import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Profil Universitas — Universitas LIA",
  description:
    "Kenali Universitas LIA, lingkungan belajar untuk mengembangkan kompetensi bahasa, teknologi, dan bisnis.",
};

const profileLinks = [
  {
    title: "Sejarah",
    description: "Jejak perjalanan dan perkembangan Universitas LIA.",
    href: "/profil/sejarah",
  },
  {
    title: "Visi & Misi",
    description: "Arah dan komitmen dalam penyelenggaraan pendidikan.",
    href: "/profil/visi-misi",
  },
  {
    title: "Struktur Organisasi",
    description: "Informasi tata kelola dan organisasi universitas.",
    href: "#informasi",
  },
  {
    title: "Akreditasi",
    description: "Informasi penjaminan mutu dan akreditasi.",
    href: "#informasi",
  },
  {
    title: "Fasilitas Kampus",
    description: "Ruang dan sarana pendukung kegiatan belajar.",
    href: "/#kehidupan",
  },
];

export default function ProfilePage() {
  return (
    <main className="profile-page">
      <ScrollReveal>
      <section aria-labelledby="profile-title" className="profile-hero profile-wrap">
        <div className="profile-hero-copy">
          <nav aria-label="Breadcrumb" className="profile-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Profil</span>
          </nav>
          <span className="profile-eyebrow">MENGENAL UNIVERSITAS LIA</span>
          <h1 id="profile-title">Profil Universitas LIA</h1>
          <p>
            Lingkungan belajar untuk mengembangkan kompetensi bahasa, teknologi,
            dan bisnis, serta mempersiapkan diri menghadapi dunia yang terus
            berkembang.
          </p>
        </div>
        <div aria-label="Ilustrasi kampus Universitas LIA" className="profile-visual" role="img">
          <span className="profile-visual-sun" />
          <span className="profile-visual-building profile-visual-building-back" />
          <span className="profile-visual-building profile-visual-building-front" />
          <span className="profile-visual-ground" />
          <span className="profile-visual-caption">LEARNING WITHOUT LIMITS</span>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal delay={70}>
      <section aria-labelledby="profile-about-title" className="profile-about profile-wrap">
        <div>
          <span className="profile-eyebrow">TENTANG KAMI</span>
          <h2 id="profile-about-title">Mengenal Universitas LIA</h2>
          <p>
            Universitas LIA bertumbuh dari pengalaman panjang dalam pendidikan
            bahasa dan terus mengembangkan cakupan pembelajaran. Melalui bidang
            humaniora dan desain, sains, serta bisnis, mahasiswa didorong untuk
            menghubungkan pengetahuan dengan kebutuhan nyata.
          </p>
          <p>
            Kami percaya proses belajar yang baik membuka kesempatan untuk
            bertukar gagasan, berkolaborasi, dan membangun bekal untuk masa
            depan.
          </p>
          <Link className="profile-text-link" href="/profil/sejarah">
            Lihat perjalanan kami <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div aria-hidden="true" className="profile-about-visual">
          <span className="profile-about-orbit" />
          <span className="profile-about-mark">LIA</span>
          <span className="profile-about-caption">Bahasa · Teknologi · Bisnis</span>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal delay={140}>
      <section
        aria-labelledby="profile-info-title"
        className="profile-information profile-wrap"
        id="informasi"
      >
        <div className="profile-section-heading">
          <span className="profile-eyebrow">JELAJAHI PROFIL</span>
          <h2 id="profile-info-title">Informasi Universitas</h2>
          <p>Pilih informasi yang ingin Anda kenali lebih lanjut.</p>
        </div>
        <div className="profile-info-grid">
          {profileLinks.map((item) => (
            <Link className="profile-info-card" href={item.href} key={item.title}>
              <span className="profile-info-accent" />
              <span className="profile-info-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span aria-hidden="true" className="profile-info-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>
      </ScrollReveal>
    </main>
  );
}
