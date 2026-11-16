import { AdminIconName } from "./admin-icons";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: AdminIconName;
  dbTable: string; // Tabel database Supabase yang sesuai
  description: string;
  badge?: string;
}

export interface AdminNavGroup {
  groupTitle: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    groupTitle: "Utama",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/admin",
        icon: "dashboard",
        dbTable: "ringkasan_sistem",
        description: "Ringkasan statistik & aktivitas data",
      },
    ],
  },
  {
    groupTitle: "Konten & Informasi",
    items: [
      {
        id: "news",
        label: "Berita Kampus",
        href: "/admin/news",
        icon: "news",
        dbTable: "news",
        description: "Manajemen artikel & berita universitas",
      },
      {
        id: "announcements",
        label: "Pengumuman",
        href: "/admin/announcements",
        icon: "announcement",
        dbTable: "announcements",
        description: "Pengumuman resmi sivitas akademika",
      },
      {
        id: "videos",
        label: "Galeri Video",
        href: "/admin/videos",
        icon: "video",
        dbTable: "media_videos",
        description: "Video kampus Cloudinary",
      },
    ],
  },
  {
    groupTitle: "Akademik & Mutu",
    items: [
      {
        id: "academic-calendar",
        label: "Kalender Akademik",
        href: "/admin/academic-calendar",
        icon: "calendar",
        dbTable: "academic_calendar_events",
        description: "Jadwal semester & agenda akademik",
      },
      {
        id: "accreditation",
        label: "Akreditasi",
        href: "/admin/accreditation",
        icon: "accreditation",
        dbTable: "accreditation_institutions, accreditation_study_programs",
        description: "Status akreditasi institusi & prodi",
      },
      {
        id: "banpt-regulations",
        label: "Regulasi BAN-PT",
        href: "/admin/banpt-regulations",
        icon: "regulation",
        dbTable: "banpt_regulations",
        description: "Dokumen & peraturan akreditasi",
      },
      {
        id: "lpm-archives",
        label: "Arsip LPM",
        href: "/admin/lpm-archives",
        icon: "archive",
        dbTable: "lpm_archives",
        description: "Arsip mutu AMI, RTM & RTL",
      },
    ],
  },
  {
    groupTitle: "Layanan & Integrasi",
    items: [
      {
        id: "assistant-knowledge",
        label: "Knowledge AI Assistant",
        href: "/admin/assistant-knowledge",
        icon: "ai",
        dbTable: "assistant_knowledge, assistant_settings",
        description: "Basis pengetahuan asisten virtual",
      },
      {
        id: "translations",
        label: "Terjemahan Konten",
        href: "/admin/translations",
        icon: "translation",
        dbTable: "content_translations",
        description: "Kamus & terjemahan multilingual",
      },
      {
        id: "google-drive",
        label: "Google Drive OAuth",
        href: "/admin/google-drive",
        icon: "drive",
        dbTable: "google_oauth_credentials, google_oauth_states",
        description: "Koneksi integrasi penyimpanan dokumen",
      },
      {
        id: "tracer-study",
        label: "Tracer Study Alumni",
        href: "/admin/tracer-study",
        icon: "tracer",
        dbTable: "tracer_study_responses",
        description: "Kuesioner penelusuran lulusan",
      },
    ],
  },
  {
    groupTitle: "Sistem & Pengguna",
    items: [
      {
        id: "admins",
        label: "Manajemen Admin",
        href: "/admin/admins",
        icon: "users",
        dbTable: "admins",
        description: "Hak akses & akun administrator",
      },
    ],
  },
];

