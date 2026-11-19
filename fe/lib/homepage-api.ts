import { apiGet } from "./api";
import type { IconName } from "@/components/icons";

export type HomepageIcon = Extract<
  IconName,
  "book" | "calendar" | "file" | "globe" | "graduate" | "message" | "monitor" | "sparkle"
>;
export type ProgramColor = "coral" | "blue" | "yellow" | "green" | "lavender" | "orange";

export interface HomepageContent {
  hero: {
    imageNote: string;
    caption: string;
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lead: string;
    values: { icon: HomepageIcon; title: string; description: string }[];
    linkLabel: string;
    linkHref: string;
    mediaLabel: string;
    mediaCaption: string;
  };
  programs: {
    eyebrow: string;
    title: string;
    lead: string;
    linkLabel: string;
    linkHref: string;
    items: { eyebrow: string; title: string; code: string; color: ProgramColor; href: string }[];
  };
  campusLife: {
    eyebrow: string;
    title: string;
    description: string;
    linkLabel: string;
    linkHref: string;
    photoLabel: string;
  };
  admission: {
    eyebrow: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  quickLinks: { name: string; detail: string; icon: HomepageIcon; href: string }[];
  partners: { title: string; items: string[] };
}

export type HomepagePlacement = "hero" | "about" | "campus_life";

export interface HomepagePhoto {
  id: string;
  placement: HomepagePlacement;
  title: string;
  caption: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface HomepageVideo {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  video: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    format: string | null;
    bytes: number | null;
    duration: number | null;
  } | null;
}

export interface HomepageData {
  content: HomepageContent;
  photos: { hero: HomepagePhoto[]; about: HomepagePhoto[]; campusLife: HomepagePhoto[] };
  videos: HomepageVideo[];
}

// Teks bawaan (sama dengan default di backend). Dipakai saat API belum menjawab atau gagal,
// agar beranda tidak pernah kosong.
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    imageNote: "KAMPUS UNIVERSITAS LIA · VIDEO PREVIEW",
    caption: "Tempat ide tumbuh dan masa depan dimulai",
    eyebrow: "UNIVERSITAS LIA",
    titleLine1: "Empowering Minds,",
    titleLine2: "Inspiring Futures.",
    description:
      "Belajar bahasa, teknologi, dan bisnis bersama komunitas yang mendukungmu tumbuh dan siap menghadapi dunia.",
    primaryLabel: "Temukan program studi",
    primaryHref: "#program",
    secondaryLabel: "Kenali Universitas LIA",
    secondaryHref: "/profil",
  },
  about: {
    eyebrow: "TENTANG UNIVERSITAS LIA",
    title: "Transformasi STIA LIA menjadi Universitas LIA",
    lead: "Perjalanan baru untuk menghadirkan pendidikan yang relevan, inklusif, dan siap menjawab kebutuhan masa depan.",
    values: [
      { icon: "sparkle", title: "Pendidikan berkualitas", description: "Belajar dari pengajar berpengalaman" },
      { icon: "globe", title: "Wawasan global", description: "Bekal untuk berkiprah tanpa batas" },
      { icon: "graduate", title: "Siap menghadapi masa depan", description: "Kompetensi yang relevan dengan industri" },
    ],
    linkLabel: "Tentang Universitas LIA",
    linkHref: "/profil",
    mediaLabel: "LEARNING WITHOUT LIMITS",
    mediaCaption: "Cerita Universitas LIA",
  },
  programs: {
    eyebrow: "TEMUKAN MINATMU",
    title: "Belajar sesuatu yang berarti",
    lead: "Pilih program yang sesuai dengan rasa ingin tahu dan cita-citamu.",
    linkLabel: "Lihat semua program",
    linkHref: "/akademik/fakultas",
    items: [
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Desain Komunikasi Visual", code: "S1 · 8 semester", color: "coral", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Inggris", code: "S1 · 8 semester", color: "blue", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Jepang", code: "S1 · 8 semester", color: "yellow", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Bisnis Digital", code: "S1 · 8 semester", color: "green", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Sistem Informasi", code: "S1 · 8 semester", color: "lavender", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Informatika", code: "S1 · 8 semester", color: "orange", href: "/akademik/fakultas" },
    ],
  },
  campusLife: {
    eyebrow: "LEBIH DARI RUANG KELAS",
    title: "Jalani pengalaman kampus yang penuh cerita",
    description:
      "Temukan teman, kembangkan minat, dan ciptakan pengalaman berharga bersama komunitas Universitas LIA.",
    linkLabel: "Jelajahi kehidupan kampus",
    linkHref: "/kehidupan-kampus/kegiatan-mahasiswa",
    photoLabel: "HARI-HARI DI KAMPUS",
  },
  admission: {
    eyebrow: "PENERIMAAN MAHASISWA BARU",
    title: "When Technology Meets Language Expertise.",
    description:
      "Kenali informasi jalur pendaftaran, beasiswa, dan biaya kuliah sebelum memulai proses pendaftaran.",
    primaryLabel: "Daftar Sekarang",
    primaryHref: "/pmb",
    secondaryLabel: "Informasi jalur pendaftaran",
    secondaryHref: "/pmb#jalur-pendaftaran",
  },
  quickLinks: [
    { name: "SIAKAD UL", detail: "Sistem informasi akademik", icon: "graduate", href: "#footer" },
    { name: "E-Learning", detail: "Pembelajaran melalui Edlink", icon: "monitor", href: "#footer" },
    { name: "Perpustakaan", detail: "Sumber belajar dan referensi", icon: "book", href: "#footer" },
    { name: "Informasi PMB", detail: "Panduan calon mahasiswa", icon: "file", href: "/pmb" },
    { name: "E-Journal", detail: "Publikasi ilmiah dan jurnal", icon: "book", href: "#footer" },
  ],
  partners: {
    title: "Mitra Kami",
    items: ["lia", "digital", "global", "edu", "creative", "tech", "language", "future", "media", "institute", "connect", "learning"],
  },
};

export const homepageApi = {
  get: () => apiGet<HomepageData>("/homepage"),
};
