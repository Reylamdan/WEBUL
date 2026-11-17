import { AdminIconName } from "./admin-icons";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: AdminIconName;
  section: string;
}

export interface AdminNavGroup {
  groupTitle: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    groupTitle: "Beranda",
    items: [
      {
        id: "beranda",
        label: "Beranda",
        href: "/admin/beranda",
        icon: "home",
        section: "Halaman Utama",
      },
    ],
  },
  {
    groupTitle: "Profil",
    items: [
      {
        id: "profil-halaman",
        label: "Halaman Profil",
        href: "/admin/profil",
        icon: "fileText",
        section: "Profil",
      },
      {
        id: "struktur-organisasi",
        label: "Struktur Organisasi",
        href: "/admin/profil/struktur-organisasi",
        icon: "users",
        section: "Profil",
      },
      {
        id: "sambutan-rektor",
        label: "Sambutan Rektor",
        href: "/admin/profil/sambutan-rektor",
        icon: "speech",
        section: "Profil",
      },
      {
        id: "pimpinan",
        label: "Pimpinan",
        href: "/admin/profil/pimpinan",
        icon: "users",
        section: "Profil",
      },
      {
        id: "akreditasi",
        label: "Akreditasi",
        href: "/admin/profil/akreditasi",
        icon: "accreditation",
        section: "Profil",
      },
      {
        id: "fasilitas",
        label: "Fasilitas Kampus",
        href: "/admin/profil/fasilitas",
        icon: "building",
        section: "Profil",
      },
    ],
  },
  {
    groupTitle: "Akademik",
    items: [
      {
        id: "kalender-akademik",
        label: "Kalender Akademik",
        href: "/admin/akademik/kalender-akademik",
        icon: "calendar",
        section: "Akademik",
      },
      {
        id: "kurikulum",
        label: "Kurikulum",
        href: "/admin/akademik/kurikulum",
        icon: "book",
        section: "Akademik",
      },
    ],
  },
  {
    groupTitle: "PMB & Pendaftaran",
    items: [
      {
        id: "periode-pendaftaran",
        label: "Periode Pendaftaran",
        href: "/admin/pmb/periode-pendaftaran",
        icon: "calendar",
        section: "PMB",
      },
      {
        id: "biaya-kuliah",
        label: "Biaya Kuliah",
        href: "/admin/pmb/biaya-kuliah",
        icon: "wallet",
        section: "PMB",
      },
      {
        id: "rpl",
        label: "RPL (Rekognisi)",
        href: "/admin/pmb/rpl",
        icon: "graduation",
        section: "PMB",
      },
      {
        id: "cara-pembayaran",
        label: "Cara Pembayaran",
        href: "/admin/pmb/cara-pembayaran",
        icon: "wallet",
        section: "PMB",
      },
      {
        id: "pengunduran-diri",
        label: "Pengunduran Diri",
        href: "/admin/pmb/pengunduran-diri",
        icon: "userX",
        section: "PMB",
      },
      {
        id: "mahasiswa-asing",
        label: "Mahasiswa Asing",
        href: "/admin/pmb/mahasiswa-asing",
        icon: "globe",
        section: "PMB",
      },
    ],
  },
  {
    groupTitle: "Kehidupan Kampus",
    items: [
      {
        id: "ukm",
        label: "UKM",
        href: "/admin/kehidupan-kampus/ukm",
        icon: "activity",
        section: "Kehidupan Kampus",
      },
      {
        id: "kegiatan-mahasiswa",
        label: "Kegiatan Mahasiswa",
        href: "/admin/kehidupan-kampus/kegiatan-mahasiswa",
        icon: "activity",
        section: "Kehidupan Kampus",
      },
      {
        id: "berita-terkini",
        label: "Berita Terkini",
        href: "/admin/kehidupan-kampus/berita-terkini",
        icon: "news",
        section: "Kehidupan Kampus",
      },
      {
        id: "pengumuman",
        label: "Pengumuman",
        href: "/admin/kehidupan-kampus/pengumuman",
        icon: "announcement",
        section: "Kehidupan Kampus",
      },
      {
        id: "agenda-acara",
        label: "Agenda Acara",
        href: "/admin/kehidupan-kampus/agenda-acara",
        icon: "calendar",
        section: "Kehidupan Kampus",
      },
    ],
  },
  {
    groupTitle: "Alumni",
    items: [
      {
        id: "tracer-study",
        label: "Tracer Study",
        href: "/admin/alumni/tracer-study",
        icon: "tracer",
        section: "Alumni",
      },
    ],
  },
  {
    groupTitle: "Lembaga Penjaminan Mutu (LPM)",
    items: [
      {
        id: "laporan-lpm",
        label: "Laporan LPM",
        href: "/admin/lpm/laporan",
        icon: "fileText",
        section: "LPM",
      },
      {
        id: "kegiatan-lpm",
        label: "Kegiatan LPM",
        href: "/admin/lpm/kegiatan",
        icon: "activity",
        section: "LPM",
      },
      {
        id: "laporan-audit-mutu",
        label: "Laporan Tahunan Audit Mutu",
        href: "/admin/lpm/laporan-audit-mutu",
        icon: "fileText",
        section: "LPM",
      },
      {
        id: "laporan-rtm-rtl",
        label: "Laporan Tahunan RTM & RTL",
        href: "/admin/lpm/laporan-rtm-rtl",
        icon: "fileText",
        section: "LPM",
      },
      {
        id: "manajemen-arsip",
        label: "Manajemen Arsip",
        href: "/admin/lpm/manajemen-arsip",
        icon: "archive",
        section: "LPM",
      },
      {
        id: "benchmarking",
        label: "Benchmarking",
        href: "/admin/lpm/benchmarking",
        icon: "scale",
        section: "LPM",
      },
    ],
  },
  {
    groupTitle: "Laporan Rektor",
    items: [
      {
        id: "laporan-tahunan-rektor",
        label: "Laporan Tahunan Rektor",
        href: "/admin/laporan-tahunan-rektor",
        icon: "fileText",
        section: "Laporan",
      },
    ],
  },
];
