import Link from "next/link";

type LpmEntry = {
  title: string;
  description: string;
  meta?: string;
  href?: string;
};

type LpmSection = {
  slug: string;
  label: string;
  title: string;
  description: string;
  contentTitle: string;
  entries: LpmEntry[];
  isDirectory?: boolean;
};

export const lpmSections: LpmSection[] = [
  {
    slug: "lembaga-penjaminan-mutu",
    label: "Lembaga Penjaminan Mutu",
    title: "Lembaga Penjaminan Mutu",
    description:
      "Menjaga mutu pendidikan melalui evaluasi, peningkatan berkelanjutan, dan tata kelola akademik yang terarah.",
    contentTitle: "Menjaga dan meningkatkan mutu pendidikan",
    entries: [
      {
        title: "Menuju Universitas LIA yang unggul",
        description:
          "Penjaminan mutu mendukung pengembangan pendidikan dan tata kelola Universitas LIA secara berkelanjutan.",
        meta: "ARAH MUTU",
      },
      {
        title: "Membangun budaya mutu berkelanjutan",
        description:
          "Evaluasi dan tindak lanjut menjadi bagian dari upaya peningkatan mutu di lingkungan universitas.",
        meta: "BUDAYA MUTU",
      },
      {
        title: "Informasi dan kegiatan penjaminan mutu",
        description:
          "Jelajahi laporan, kegiatan, dan informasi penjaminan mutu Universitas LIA.",
        meta: "INFORMASI",
        href: "/lpm/laporan",
      },
    ],
  },
  {
    slug: "laporan",
    label: "Laporan LPM",
    title: "Laporan LPM",
    description:
      "Informasi laporan penjaminan mutu internal Universitas LIA.",
    contentTitle: "Audit mutu dan tindak lanjut",
    isDirectory: true,
    entries: [
      {
        title: "Audit Mutu Internal",
        description:
          "Informasi laporan pelaksanaan Audit Mutu Internal Universitas LIA.",
        href: "/lpm/laporan-tahunan-audit-mutu-internal",
      },
      {
        title: "Laporan Tahunan Audit Mutu Internal LIA",
        description:
          "Arsip laporan tahunan Audit Mutu Internal.",
        href: "/lpm/laporan-tahunan-audit-mutu-internal",
      },
      {
        title: "RTM dan RTL",
        description:
          "Informasi Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut.",
        href: "/lpm/laporan-tahunan-rtm-rtl",
      },
      {
        title: "Laporan Tahunan RTM dan RTL",
        description:
          "Arsip laporan tahunan Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut.",
        href: "/lpm/laporan-tahunan-rtm-rtl",
      },
    ],
  },
  {
    slug: "laporan-tahunan-audit-mutu-internal",
    label: "Laporan Tahunan Audit Mutu Internal LIA",
    title: "Laporan Tahunan Audit Mutu Internal LIA",
    description:
      "Arsip laporan tahunan Audit Mutu Internal Universitas LIA.",
    contentTitle: "Laporan tahunan",
    entries: [
      {
        title: "2025",
        description:
          "Informasi dan dokumen laporan tahunan Audit Mutu Internal tahun 2025.",
        href: "/lpm/laporan-audit-mutu-internal-2025",
      },
      {
        title: "2024",
        description:
          "Informasi laporan Audit Mutu Internal tahun 2024.",
        meta: "ARSIP",
      },
    ],
  },
  {
    slug: "laporan-audit-mutu-internal-2025",
    label: "Laporan Audit Mutu Internal 2025",
    title: "Laporan Audit Mutu Internal 2025",
    description:
      "Informasi laporan Audit Mutu Internal Universitas LIA tahun 2025.",
    contentTitle: "Dokumen laporan",
    entries: [
      {
        title: "Menunggu publikasi atau verifikasi",
        description:
          "Dokumen laporan Audit Mutu Internal 2025 belum tersedia untuk ditampilkan. Informasi akan diperbarui setelah arsip resmi dipublikasikan atau diverifikasi.",
        meta: "ARSIP BELUM TERSEDIA",
      },
    ],
  },
  {
    slug: "laporan-tahunan-rtm-rtl",
    label: "Laporan Tahunan RTM dan RTL",
    title: "Laporan Tahunan RTM dan RTL",
    description:
      "Arsip laporan Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut.",
    contentTitle: "Laporan tahunan",
    entries: [
      {
        title: "2025",
        description:
          "Informasi dan dokumen laporan tahunan RTM dan RTL tahun 2025.",
        href: "/lpm/laporan-rtm-rtl-2025",
      },
      {
        title: "2024",
        description:
          "Informasi laporan tahunan RTM dan RTL tahun 2024.",
        meta: "ARSIP",
      },
    ],
  },
  {
    slug: "laporan-rtm-rtl-2025",
    label: "Laporan RTM dan RTL 2025",
    title: "Laporan RTM dan RTL 2025",
    description:
      "Informasi laporan Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut tahun 2025.",
    contentTitle: "Dokumen laporan",
    entries: [
      {
        title: "Menunggu publikasi atau verifikasi",
        description:
          "Dokumen laporan RTM dan RTL 2025 belum tersedia untuk ditampilkan. Informasi akan diperbarui setelah arsip resmi dipublikasikan atau diverifikasi.",
        meta: "ARSIP BELUM TERSEDIA",
      },
    ],
  },
  {
    slug: "kegiatan",
    label: "Kegiatan LPM",
    title: "Kegiatan LPM",
    description:
      "Informasi kegiatan penjaminan mutu dan peningkatan mutu di Universitas LIA.",
    contentTitle: "Kegiatan penjaminan mutu",
    entries: [
      {
        title: "Sosialisasi Standar Mutu & SOP",
        description:
          "Kegiatan sosialisasi standar mutu dan prosedur operasional.",
        meta: "8 MEI 2024",
      },
      {
        title: "Sosialisasi AMI",
        description:
          "Sosialisasi pelaksanaan Audit Mutu Internal.",
        meta: "15 MEI 2024",
      },
      {
        title: "Pelaksanaan AMI",
        description:
          "Pelaksanaan Audit Mutu Internal di lingkungan Universitas LIA.",
        meta: "10 JULI 2024",
      },
      {
        title: "Review Hasil AMI",
        description:
          "Tinjauan hasil Audit Mutu Internal sebagai bahan evaluasi dan tindak lanjut.",
        meta: "24 JULI 2024",
      },
    ],
  },
  {
    slug: "benchmarking",
    label: "Benchmarking",
    title: "Benchmarking",
    description:
      "Informasi kegiatan benchmarking penjaminan mutu Universitas LIA.",
    contentTitle: "Berbagi praktik baik",
    entries: [
      {
        title: "Benchmarking LPM Universitas LIA ke Universitas Nasional",
        description:
          "Kegiatan berbagi informasi dan praktik penjaminan mutu antarperguruan tinggi.",
      },
      {
        title: "Dokumentasi resmi",
        description:
          "Dokumentasi kegiatan akan ditampilkan setelah materi resmi tersedia.",
        meta: "DOKUMENTASI",
      },
    ],
  },
];

export function LpmContent({ slug }: { slug: string }) {
  const section = lpmSections.find((item) => item.slug === slug);

  if (!section) {
    return null;
  }

  return (
    <main className="lpm-content-page">
      <section className="lpm-content-hero">
        <div className="lpm-content-wrap">
          <nav aria-label="Breadcrumb" className="profile-breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span>LPM</span>
            {section.slug !== "lembaga-penjaminan-mutu" ? (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{section.label}</span>
              </>
            ) : null}
          </nav>
          <span className="lpm-content-eyebrow">LEMBAGA PENJAMINAN MUTU</span>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
      </section>

      <nav
        aria-label="Navigasi halaman LPM"
        className="lpm-section-nav lpm-content-wrap"
      >
        {lpmSections.map((item) => (
          <Link
            aria-current={item.slug === section.slug ? "page" : undefined}
            className={item.slug === section.slug ? "is-current" : ""}
            href={item.slug === "lembaga-penjaminan-mutu" ? "/lpm" : `/lpm/${item.slug}`}
            key={item.slug}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section
        aria-labelledby="lpm-content-title"
        className="lpm-content-section lpm-content-wrap"
      >
        <span className="lpm-content-eyebrow">
          {section.isDirectory ? "ARSIP DAN INFORMASI" : "PENJAMINAN MUTU"}
        </span>
        <h2 id="lpm-content-title">{section.contentTitle}</h2>
        <div
          className={`lpm-entry-list${section.isDirectory ? " lpm-entry-grid" : ""}`}
        >
          {section.entries.map((entry) => {
            const content = (
              <>
                {entry.meta ? <span className="lpm-entry-meta">{entry.meta}</span> : null}
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
                {entry.href ? (
                  <span aria-hidden="true" className="lpm-entry-arrow">
                    →
                  </span>
                ) : null}
              </>
            );

            return entry.href ? (
              <Link className="lpm-entry-card" href={entry.href} key={entry.title}>
                {content}
              </Link>
            ) : (
              <article className="lpm-entry-card" key={entry.title}>
                {content}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
