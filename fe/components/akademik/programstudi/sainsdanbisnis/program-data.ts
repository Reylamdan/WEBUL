export interface SainsBisnisProgramLink {
  label: string;
  href: string;
  level: string;
}

export interface SainsBisnisProgram {
  slug: string;
  title: string;
  level: string;
  accreditation: string;
  introduction: [string, string];
  courseExamples: string;
  graduateProfiles: string;
  sources: string[];
}

const programRoot = "/akademik/programstudi/sainsdanbisnis";

export const sainsBisnisPrograms: SainsBisnisProgramLink[] = [
  {
    label: "Bisnis Digital",
    href: `${programRoot}/s1-bisnis-digital`,
    level: "S1 · SARJANA",
  },
  {
    label: "Informatika",
    href: `${programRoot}/s1-informatika`,
    level: "S1 · SARJANA",
  },
  {
    label: "Sistem Informasi",
    href: `${programRoot}/s1-sistem-informasi`,
    level: "S1 · SARJANA",
  },
];

export const sainsBisnisProgramDetails: Record<string, SainsBisnisProgram> = {
  "s1-bisnis-digital": {
    slug: "s1-bisnis-digital",
    title: "S1 Bisnis Digital",
    level: "S1 · SARJANA",
    accreditation: "Baik",
    introduction: [
      "Program studi Bisnis Digital mempelajari bisnis berbasis teknologi, pemasaran digital, e-commerce, analitik data, dan inovasi digital. Bidang-bidang tersebut dipadukan dengan manajemen dan bahasa asing.",
      "Fokus pembelajaran menghubungkan pemahaman bisnis dengan penerapan teknologi dan inovasi digital.",
    ],
    courseExamples:
      "Pengantar Bisnis Digital; Statistika Bisnis dan Ekonomi; Akuntansi Bisnis; Komunikasi Bisnis dan Negosiasi; Pemasaran Digital; Transaksi Digital dan Teknologi Keuangan; Design Thinking; E-commerce.",
    graduateProfiles:
      "Business Consultant, Market Researcher, Technopreneur, Social Media Specialist, Digital Marketing Specialist, dan Financial Technology Analyst.",
    sources: [
      "https://www.universitaslia.ac.id/s1-bisnis-digital/",
      "https://www.universitaslia.ac.id/pmb/",
    ],
  },
  "s1-informatika": {
    slug: "s1-informatika",
    title: "S1 Informatika",
    level: "S1 · SARJANA",
    accreditation: "Baik",
    introduction: [
      "Program studi Informatika mempelajari ilmu komputer, pemrograman, pengembangan perangkat lunak, kecerdasan buatan, dan teknologi informasi. Pembelajaran mengintegrasikan kompetensi teknologi informatika, bahasa asing, dan soft skills.",
      "Bidang pembelajaran meliputi pengembangan perangkat lunak, sistem komputer, data, dan kecerdasan buatan.",
    ],
    courseExamples:
      "Algoritma Pemrograman; Struktur Data; Pemrograman Web; Sistem Operasi; Sistem Basis Data; Jaringan Komputer; Rekayasa Perangkat Lunak; Kecerdasan Buatan. Mata kuliah lanjutan mencakup Cloud Computing, Data Science, dan Internet of Things.",
    graduateProfiles:
      "Software Engineer Specialist, IT Infrastructure Specialist, Cybersecurity Specialist, Database Specialist, AI Engineer & Consultant, dan IoT Engineer & Consultant.",
    sources: [
      "https://www.universitaslia.ac.id/s1-informatika/",
      "https://www.universitaslia.ac.id/pmb/",
    ],
  },
  "s1-sistem-informasi": {
    slug: "s1-sistem-informasi",
    title: "S1 Sistem Informasi",
    level: "S1 · SARJANA",
    accreditation: "Baik",
    introduction: [
      "Program studi Sistem Informasi berfokus pada pengembangan dan pengelolaan sistem informasi untuk mendukung pengambilan keputusan serta efisiensi organisasi. Pembelajaran mencakup analisis kebutuhan bisnis dan pemanfaatan teknologi informasi secara strategis.",
      "Kompetensi sistem informasi dipadukan dengan bahasa asing, etika, dan kewirausahaan digital.",
    ],
    courseExamples:
      "Konsep Sistem Informasi; Dasar Proses Bisnis; Transformasi Digital; Analisis dan Perancangan Sistem Informasi; Sistem Enterprise; Desain UI/UX; Audit Sistem Informasi; Manajemen Proyek SI; Tata Kelola TI.",
    graduateProfiles:
      "IT Consultant, System Analyst, Data Analyst, IT Project Manager, Information Security Analyst, Startup Developer, dan UI/UX Designer.",
    sources: [
      "https://www.universitaslia.ac.id/s1-sistem-informasi/",
      "https://www.universitaslia.ac.id/pmb/",
    ],
  },
};
