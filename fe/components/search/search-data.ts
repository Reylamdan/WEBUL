export type SearchPage = {
  title: string;
  category: string;
  description: string;
  keywords: string[];
  href: string;
  featured?: boolean;
};

export const searchPages: SearchPage[] = [
  {
    title: "Beranda",
    category: "Universitas",
    description: "Halaman utama Universitas LIA.",
    keywords: ["home", "utama", "universitas lia"],
    href: "/",
    featured: true,
  },
  {
    title: "Profil Universitas",
    category: "Profil",
    description: "Kenali Universitas LIA dan informasi umum institusi.",
    keywords: ["profil", "tentang", "universitas"],
    href: "/profil",
    featured: true,
  },
  {
    title: "Sejarah",
    category: "Profil",
    description: "Perjalanan dan perkembangan Universitas LIA.",
    keywords: ["sejarah", "riwayat", "perjalanan"],
    href: "/profil/sejarah",
  },
  {
    title: "Visi & Misi",
    category: "Profil",
    description: "Visi, misi, dan arah pengembangan Universitas LIA.",
    keywords: ["visi", "misi", "tujuan"],
    href: "/profil/visi-misi",
  },
  {
    title: "Struktur Organisasi",
    category: "Profil",
    description: "Susunan organisasi Universitas LIA.",
    keywords: ["struktur", "organisasi", "pimpinan"],
    href: "/profil/struktur-organisasi",
  },
  {
    title: "Akreditasi",
    category: "Profil",
    description: "Informasi akreditasi institusi Universitas LIA.",
    keywords: ["akreditasi", "institusi", "mutu"],
    href: "/profil/akreditasi",
  },
  {
    title: "Fasilitas Kampus",
    category: "Profil",
    description: "Fasilitas dan layanan yang tersedia di kampus.",
    keywords: ["fasilitas", "kampus", "sarana", "prasarana"],
    href: "/profil/fasilitas-kampus",
  },
  {
    title: "Unit dan Bagian",
    category: "Profil",
    description: "Daftar unit dan bagian di Universitas LIA.",
    keywords: ["unit", "bagian", "layanan", "administrasi"],
    href: "/profil/unit-dan-bagian",
  },
  {
    title: "BAAKA",
    category: "Profil · Unit dan Bagian",
    description: "Informasi Biro Administrasi Akademik dan Kemahasiswaan.",
    keywords: ["baaka", "akademik", "kemahasiswaan", "administrasi"],
    href: "/profil/unit-dan-bagian/baaka",
  },
  {
    title: "BAUSK",
    category: "Profil · Unit dan Bagian",
    description: "Informasi Biro Administrasi Umum dan Sumber Daya.",
    keywords: ["bausk", "administrasi umum", "sumber daya"],
    href: "/profil/unit-dan-bagian/bausk",
  },
  {
    title: "UPT Komputer",
    category: "Profil · Unit dan Bagian",
    description: "Informasi unit layanan komputer Universitas LIA.",
    keywords: ["upt komputer", "teknologi", "komputer"],
    href: "/profil/unit-dan-bagian/upt-komputer",
  },
  {
    title: "Blueprint TIK UPT Komputer",
    category: "Profil · Unit dan Bagian",
    description: "Informasi blueprint teknologi informasi dan komunikasi.",
    keywords: ["blueprint", "tik", "teknologi informasi", "komputer"],
    href: "/profil/unit-dan-bagian/upt-komputer/blueprint-tik",
  },
  {
    title: "Blueprint TIK",
    category: "Profil · Unit dan Bagian",
    description: "Informasi blueprint teknologi informasi dan komunikasi.",
    keywords: ["blueprint", "tik", "teknologi informasi"],
    href: "/profil/unit-dan-bagian/blueprint-tik",
  },
  {
    title: "UPT Humas dan Marketing",
    category: "Profil · Unit dan Bagian",
    description: "Informasi layanan hubungan masyarakat dan marketing.",
    keywords: ["humas", "marketing", "promosi"],
    href: "/profil/unit-dan-bagian/upt-humas-marketing",
  },
  {
    title: "UPT Perpustakaan",
    category: "Profil · Unit dan Bagian",
    description: "Informasi layanan perpustakaan Universitas LIA.",
    keywords: ["perpustakaan", "buku", "literasi"],
    href: "/profil/unit-dan-bagian/upt-perpustakaan",
  },
  {
    title: "Akademik",
    category: "Akademik",
    description: "Informasi fakultas dan kegiatan akademik Universitas LIA.",
    keywords: ["akademik", "fakultas", "kuliah"],
    href: "/akademik/fakultas",
    featured: true,
  },
  {
    title: "Fakultas",
    category: "Akademik",
    description: "Daftar fakultas dan program studi Universitas LIA.",
    keywords: ["fakultas", "program studi", "jurusan"],
    href: "/akademik/fakultas",
  },
  {
    title: "Akreditasi Program Studi",
    category: "Akademik",
    description: "Informasi akreditasi program studi.",
    keywords: ["akreditasi", "program studi", "mutu"],
    href: "/akademik/akreditasi",
  },
  {
    title: "Kalender Akademik",
    category: "Akademik",
    description: "Kalender akademik dan jadwal kegiatan perkuliahan.",
    keywords: ["kalender", "jadwal", "semester", "akademik"],
    href: "/akademik/kalender-akademik",
    featured: true,
  },
  {
    title: "Kurikulum",
    category: "Akademik",
    description: "Informasi kurikulum program studi Universitas LIA.",
    keywords: ["kurikulum", "mata kuliah", "akademik"],
    href: "/akademik/kurikulum",
    featured: true,
  },
  {
    title: "Program Studi Humaniora dan Desain",
    category: "Akademik · Program Studi",
    description: "Program studi di bidang humaniora, bahasa, dan desain.",
    keywords: ["humaniora", "desain", "program studi"],
    href: "/akademik/programstudi/humanioradesain",
  },
  {
    title: "S1 Desain Komunikasi Visual",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Desain Komunikasi Visual.",
    keywords: ["dkv", "desain", "komunikasi visual", "seni"],
    href: "/akademik/programstudi/humanioradesain/s1-dkv",
  },
  {
    title: "S1 Bahasa Jepang",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Bahasa Jepang.",
    keywords: ["bahasa jepang", "jepang", "bahasa asing"],
    href: "/akademik/programstudi/humanioradesain/s1-bjepang",
  },
  {
    title: "D3 Bahasa Inggris",
    category: "Akademik · Program Studi",
    description: "Program Diploma Bahasa Inggris.",
    keywords: ["bahasa inggris", "d3", "diploma"],
    href: "/akademik/programstudi/humanioradesain/d3-bing",
  },
  {
    title: "S1 Bahasa Inggris",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Bahasa Inggris.",
    keywords: ["bahasa inggris", "s1", "bahasa asing"],
    href: "/akademik/programstudi/humanioradesain/s1-bing",
  },
  {
    title: "Program Studi Sains dan Bisnis",
    category: "Akademik · Program Studi",
    description: "Program studi di bidang sains, teknologi, dan bisnis.",
    keywords: ["sains", "bisnis", "program studi"],
    href: "/akademik/programstudi/sainsdanbisnis",
  },
  {
    title: "S1 Bisnis Digital",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Bisnis Digital.",
    keywords: ["bisnis digital", "bisnis", "digital"],
    href: "/akademik/programstudi/sainsdanbisnis/s1-bisnis-digital",
  },
  {
    title: "S1 Informatika",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Informatika.",
    keywords: ["informatika", "komputer", "teknologi"],
    href: "/akademik/programstudi/sainsdanbisnis/s1-informatika",
  },
  {
    title: "S1 Sistem Informasi",
    category: "Akademik · Program Studi",
    description: "Program Sarjana Sistem Informasi.",
    keywords: ["sistem informasi", "teknologi", "komputer"],
    href: "/akademik/programstudi/sainsdanbisnis/s1-sistem-informasi",
  },
  {
    title: "Penerimaan Mahasiswa Baru",
    category: "PMB",
    description: "Informasi penerimaan mahasiswa baru Universitas LIA.",
    keywords: ["pmb", "pendaftaran", "mahasiswa baru", "kuliah"],
    href: "/pmb",
    featured: true,
  },
  {
    title: "Periode Pendaftaran",
    category: "PMB",
    description: "Jadwal pendaftaran, tes, dan daftar ulang mahasiswa baru.",
    keywords: ["pendaftaran", "jadwal", "gelombang", "tes", "daftar ulang"],
    href: "/pmb/periode-pendaftaran",
  },
  {
    title: "Biaya Kuliah",
    category: "PMB",
    description: "Informasi contoh UKT berdasarkan gelombang dan program studi.",
    keywords: ["biaya", "ukt", "kuliah", "uang kuliah", "pendaftaran"],
    href: "/pmb/biaya-kuliah",
  },
  {
    title: "Jalur RPL",
    category: "PMB",
    description: "Informasi jalur Rekognisi Pembelajaran Lampau.",
    keywords: ["rpl", "rekognisi", "pembelajaran lampau", "pendaftaran"],
    href: "/pmb/jalur-rpl",
  },
  {
    title: "LPPM",
    category: "LPPM",
    description: "Penelitian, pengabdian kepada masyarakat, dan publikasi.",
    keywords: ["lppm", "penelitian", "pengabdian", "publikasi"],
    href: "/lppm",
    featured: true,
  },
  {
    title: "Kegiatan Mahasiswa (UKM)",
    category: "Kehidupan Kampus",
    description: "Informasi kegiatan dan unit kegiatan mahasiswa.",
    keywords: ["ukm", "mahasiswa", "organisasi", "kegiatan"],
    href: "/kehidupan-kampus/kegiatan-mahasiswa",
  },
  {
    title: "Berita Terkini",
    category: "Kehidupan Kampus",
    description: "Berita dan informasi terbaru seputar Universitas LIA.",
    keywords: ["berita", "terkini", "informasi", "kampus"],
    href: "/kehidupan-kampus/berita-terkini",
    featured: true,
  },
  {
    title: "Pengumuman Kampus",
    category: "Kehidupan Kampus",
    description: "Pengumuman dan informasi untuk civitas akademika.",
    keywords: ["pengumuman", "informasi", "kampus"],
    href: "/kehidupan-kampus/pengumuman",
  },
  {
    title: "Agenda Acara",
    category: "Kehidupan Kampus",
    description: "Jadwal dan agenda acara Universitas LIA.",
    keywords: ["agenda", "acara", "jadwal", "event"],
    href: "/kehidupan-kampus/agenda-acara",
  },
  {
    title: "UKM",
    category: "Kehidupan Kampus",
    description: "Pilihan unit kegiatan mahasiswa.",
    keywords: ["ukm", "unit kegiatan", "mahasiswa"],
    href: "/kehidupan-kampus/ukm",
  },
  {
    title: "Alumni",
    category: "Alumni",
    description: "Informasi dan layanan untuk alumni Universitas LIA.",
    keywords: ["alumni", "lulusan", "jejaring"],
    href: "/alumni",
    featured: true,
  },
  {
    title: "Ikatan Alumni",
    category: "Alumni",
    description: "Informasi komunitas dan ikatan alumni Universitas LIA.",
    keywords: ["ikatan", "alumni", "komunitas"],
    href: "/alumni/ikatan-alumni",
  },
  {
    title: "Tracer Study",
    category: "Alumni",
    description: "Kuesioner dan informasi tracer study alumni.",
    keywords: ["tracer study", "kuesioner", "alumni", "lulusan"],
    href: "/alumni/tracer-study",
  },
  {
    title: "Career Center",
    category: "Alumni",
    description: "Informasi karier dan lowongan kerja untuk alumni.",
    keywords: ["career center", "karier", "lowongan kerja", "alumni"],
    href: "/alumni/career-center",
  },
  {
    title: "Laporan Tahunan Rektor",
    category: "Universitas",
    description: "Laporan tahunan Rektor Universitas LIA.",
    keywords: ["laporan", "rektor", "tahunan", "universitas"],
    href: "/laporan-tahunan-rektor",
  },
  {
    title: "LPM",
    category: "Lembaga Penjaminan Mutu",
    description: "Informasi Lembaga Penjaminan Mutu Universitas LIA.",
    keywords: ["lpm", "mutu", "penjaminan mutu"],
    href: "/lpm",
    featured: true,
  },
  {
    title: "Laporan LPM",
    category: "LPM",
    description: "Laporan penjaminan mutu internal Universitas LIA.",
    keywords: ["lpm", "laporan", "audit", "mutu"],
    href: "/lpm/laporan-lpm",
  },
  {
    title: "Laporan Tahunan Audit Mutu Internal",
    category: "LPM · Laporan",
    description: "Arsip laporan tahunan Audit Mutu Internal.",
    keywords: ["ami", "audit mutu internal", "laporan", "tahunan"],
    href: "/lpm/laporan-lpm/laporan-tahunan-audit-mutu-internal",
  },
  {
    title: "Laporan Audit Mutu Internal 2025",
    category: "LPM · Laporan",
    description: "Halaman informasi laporan Audit Mutu Internal 2025.",
    keywords: ["ami", "audit", "2025", "laporan"],
    href: "/lpm/laporan-lpm/laporan-tahunan-audit-mutu-internal/laporan-audit-mutu-internal-2025",
  },
  {
    title: "Laporan Tahunan RTM & RTL",
    category: "LPM · Laporan",
    description: "Arsip laporan Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut.",
    keywords: ["rtm", "rtl", "rapat tinjauan manajemen", "laporan tahunan"],
    href: "/lpm/laporan-lpm/laporan-tahunan-rtm-rtl",
  },
  {
    title: "Laporan RTM dan RTL 2025",
    category: "LPM · Laporan",
    description: "Halaman informasi laporan RTM dan RTL tahun 2025.",
    keywords: ["rtm", "rtl", "2025", "laporan"],
    href: "/lpm/laporan-lpm/laporan-tahunan-rtm-rtl/laporan-rtm-dan-rtl-2025",
  },
  {
    title: "Management Arsip",
    category: "LPM · Laporan",
    description: "Katalog publik contoh arsip dan dokumen LPM.",
    keywords: ["arsip", "dokumen", "lpm", "manajemen"],
    href: "/lpm/manajemen-arsip",
  },
  {
    title: "Kegiatan LPM",
    category: "LPM",
    description: "Kegiatan Lembaga Penjaminan Mutu.",
    keywords: ["lpm", "kegiatan", "mutu"],
    href: "/lpm/kegiatan-lpm",
  },
  {
    title: "Benchmarking LPM",
    category: "LPM · Kegiatan",
    description: "Informasi kegiatan benchmarking Lembaga Penjaminan Mutu.",
    keywords: ["benchmarking", "lpm", "kegiatan"],
    href: "/lpm/kegiatan-lpm/benchmarking",
  },
  {
    title: "Pengumuman",
    category: "Informasi",
    description: "Daftar pengumuman Universitas LIA.",
    keywords: ["pengumuman", "informasi"],
    href: "/pengumuman",
  },
];

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .trim();
}

export function findSearchPages(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return searchPages.filter((page) => page.featured);
  }

  const tokens = normalizedQuery.split(/\s+/);

  return searchPages
    .map((page) => {
      const title = normalizeSearchText(page.title);
      const category = normalizeSearchText(page.category);
      const description = normalizeSearchText(page.description);
      const keywords = normalizeSearchText(page.keywords.join(" "));
      const searchableText = `${title} ${category} ${description} ${keywords}`;

      if (!tokens.every((token) => searchableText.includes(token))) return null;

      let score = 0;
      if (title === normalizedQuery) score += 100;
      else if (title.startsWith(normalizedQuery)) score += 70;
      else if (title.includes(normalizedQuery)) score += 55;
      if (category.includes(normalizedQuery)) score += 35;
      if (keywords.includes(normalizedQuery)) score += 25;
      if (description.includes(normalizedQuery)) score += 15;
      score += tokens.filter((token) => title.includes(token)).length * 5;

      return { page, score };
    })
    .filter((match): match is { page: SearchPage; score: number } => match !== null)
    .sort((left, right) => right.score - left.score)
    .map(({ page }) => page);
}
