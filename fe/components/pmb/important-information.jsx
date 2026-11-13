
import Link from "next/link";
import { Icon } from "@/components/icons";

const informationItems = [
  {
    title: "Periode Pendaftaran",
    description: "Lihat jadwal pendaftaran, tes, dan daftar ulang.",
    icon: "calendar",
    href: "/pmb/periode-pendaftaran",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  {
    title: "Biaya Kuliah",
    description: "Lihat informasi UKT berdasarkan gelombang pendaftaran.",
    icon: "file",
    href: "/pmb/biaya-kuliah",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  {
    title: "RPL",
    description: "Informasi Rekognisi Pembelajaran Lampau.",
    icon: "book",
    href: "/pmb/jalur-rpl",
  },
  {
    title: "Cara Pembayaran",
    description: "Informasi panduan pembayaran perkuliahan.",
    icon: "monitor",
    href: "/pmb/cara-pembayaran",
  },
  {
    title: "Fasilitas",
    description: "Kenali fasilitas yang tersedia di lingkungan kampus.",
    icon: "sparkle",
    href: "/profil/fasilitas-kampus",
  },
  {
    title: "UKM",
    description: "Jelajahi kegiatan dan organisasi mahasiswa.",
    icon: "graduate",
    href: "/kehidupan-kampus/kegiatan-mahasiswa",
  },
  {
    title: "Pengunduran Diri",
    description: "Informasi mengenai proses pengunduran diri mahasiswa.",
    icon: "arrow",
    href: "/pengunduran-diri",
  },
  {
    title: "Mahasiswa Asing",
    description: "Informasi awal bagi calon mahasiswa internasional.",
    icon: "globe",
    href: "/pmb/mahasiswa-asing",
    target: "_blank",
    rel: "noopener noreferrer",
  },
];

function InformationCard({ item }) {
  const content = (
    <>
      <span className="pmb-important-icon">
        <Icon name={item.icon} size={20} />
      </span>

      <span className="pmb-important-copy">
        <strong>{item.title}</strong>
        <span>{item.description}</span>
      </span>

      {item.href ? (
        <span aria-hidden="true" className="pmb-important-arrow">
          <Icon name="arrow" size={16} />
        </span>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <article className="pmb-important-card">
        {content}
      </article>
    );
  }

  return (
    <Link
      className="pmb-important-card"
      href={item.href}
      rel={item.rel}
      target={item.target}
    >
      {content}
    </Link>
  );
}

export function ImportantInformation() {
  return (
    <div className="pmb-important-grid">
      {informationItems.map((item) => (
        <InformationCard item={item} key={item.title} />
      ))}
    </div>
  );
}
