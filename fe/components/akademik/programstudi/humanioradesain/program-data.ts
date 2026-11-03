export interface HumanioraProgramLink {
  label: string;
  href: string;
  level: string;
}

export interface ProgramInformationCard {
  title: string;
  description: string;
}

export interface HumanioraProgram {
  slug: string;
  shortName: string;
  title: string;
  level: string;
  accreditation: string;
  accreditationNote?: string;
  introduction: string[];
  informationCards: [ProgramInformationCard, ProgramInformationCard];
  graduates: string;
  sources: string[];
}

export const humanioraPrograms: HumanioraProgramLink[] = [
  {
    label: "Bahasa Inggris",
    href: "/akademik/programstudi/humanioradesain/d3-bing",
    level: "D3 · DIPLOMA",
  },
  {
    label: "Bahasa Inggris",
    href: "/akademik/programstudi/humanioradesain/s1-bing",
    level: "S1 · SARJANA",
  },
  {
    label: "Bahasa Jepang",
    href: "/akademik/programstudi/humanioradesain/s1-bjepang",
    level: "S1 · SARJANA",
  },
  {
    label: "Desain Komunikasi Visual",
    href: "/akademik/programstudi/humanioradesain/s1-dkv",
    level: "S1 · SARJANA",
  },
];

const officialSources = [
  "https://www.universitaslia.ac.id/",
  "https://www.universitaslia.ac.id/pmb/",
];

export const humanioraProgramDetails: Record<string, HumanioraProgram> = {
  "d3-bing": {
    slug: "d3-bing",
    shortName: "D3 Bahasa Inggris",
    title: "D3 Bahasa Inggris",
    level: "D3 · DIPLOMA",
    accreditation: "Terakreditasi",
    accreditationNote:
      "Sumber Akreditasi: 355/SK/BAN-PT/Ak.P/D3/IV/2024. Peringkat terakreditasi Baik, masa penilaian sampai dengan Maret 2029.",
    introduction: [
      "Pendidikan vokasi Bahasa Inggris yang mengembangkan keterampilan menyimak, membaca, berbicara, dan menulis serta penguasaan tata bahasa Inggris. Pembelajaran diarahkan pada penerapan bahasa dalam situasi kerja pariwisata dan industri pariwisata.",
      "Mengembangkan kompetensi berbahasa Inggris, kreativitas, inovasi, dan jiwa wirausaha, serta kemampuan berpikir kritis dan sistematis.",
    ],
    informationCards: [
      {
        title: "Tujuan pendidikan vokasi",
        description:
          "Mengembangkan kompetensi berbahasa Inggris, kreativitas, inovasi, dan jiwa wirausaha, serta kemampuan berpikir kritis dan sistematis.",
      },
      {
        title: "Profil lulusan yang dipublikasikan",
        description:
          "Copywriter, Public Relation, Customer Service, Announcer, Finance Admin, Call Center, dan Secretary.",
      },
    ],
    graduates:
      "Profil mengacu pada halaman resmi program studi, bukan jaminan pekerjaan.",
    sources: officialSources,
  },
  "s1-bing": {
    slug: "s1-bing",
    shortName: "S1 Bahasa Inggris",
    title: "S1 Bahasa Inggris",
    level: "S1 · SARJANA",
    accreditation: "Baik Sekali",
    introduction: [
      "Program studi Bahasa Inggris mengembangkan empat keterampilan berbahasa: menyimak, membaca, berbicara, dan menulis, disertai penguasaan tata bahasa. Peminatan mencakup terjemahan, pengajaran, dan pariwisata.",
      "Pembelajaran mengembangkan kompetensi penerjemahan dan pengajaran, kemampuan berpikir kritis, serta pemahaman linguistik terapan.",
    ],
    informationCards: [
      {
        title: "Peminatan dan kompetensi",
        description:
          "Pembelajaran mengembangkan kompetensi penerjemahan dan pengajaran, kemampuan berpikir kritis, serta pemahaman linguistik terapan.",
      },
      {
        title: "Profil lulusan yang dipublikasikan",
        description:
          "Writer, Blogger, Advertising Executive, Tour Guide, Lecturer, Diplomatic Staff, Translator, Entrepreneur, dan Interpreter.",
      },
    ],
    graduates:
      "Profil mengacu pada halaman resmi program studi, bukan jaminan pekerjaan.",
    sources: officialSources,
  },
  "s1-bjepang": {
    slug: "s1-bjepang",
    shortName: "S1 Bahasa Jepang",
    title: "S1 Bahasa Jepang",
    level: "S1 · SARJANA",
    accreditation: "B",
    accreditationNote:
      "Kompetensi bahasa yang dipublikasikan mengacu pada kemampuan setingkat JLPT N3/N2. Hal ini bukan jaminan sertifikasi JLPT.",
    introduction: [
      "Program studi Bahasa Jepang mengembangkan keterampilan berbahasa Jepang dengan pemahaman budaya dan etika bisnis Jepang. Mahasiswa dapat mendalami peminatan penerjemahan atau pariwisata.",
      "Kompetensi bahasa yang dipublikasikan mengacu pada kemampuan setingkat JLPT N3/N2. Hal ini bukan jaminan sertifikasi JLPT.",
    ],
    informationCards: [
      {
        title: "Contoh mata kuliah",
        description:
          "Tata Bahasa; Membaca & Menulis Kanji; Fononorfologi Jepang; Sintaksis Jepang; Semantik Bahasa Jepang; Pengantar Penerjemahan; Bahasa Jepang Bisnis; Korespondensi Jepang.",
      },
      {
        title: "Profil lulusan yang dipublikasikan",
        description:
          "Interpreter bahasa Jepang, Wirausaha, Tour Guide, Editor, dan Penulis.",
      },
    ],
    graduates:
      "Profil mengacu pada halaman resmi program studi, bukan jaminan pekerjaan.",
    sources: officialSources,
  },
  "s1-dkv": {
    slug: "s1-dkv",
    shortName: "S1 Desain Komunikasi Visual",
    title: "S1 Desain Komunikasi Visual",
    level: "S1 · SARJANA",
    accreditation: "Terakreditasi Sementara",
    introduction: [
      "Program studi Desain Komunikasi Visual mengembangkan kreativitas, estetika, dan kemampuan komunikasi visual dalam berbagai media. Pembelajaran mencakup teknologi informasi dan komunikasi, wawasan global, bahasa asing, serta kewirausahaan.",
      "U.P.B.A.N: Upaya, Rasa, Budaya, Akhlak, Negeri.",
    ],
    informationCards: [
      {
        title: "Contoh mata kuliah",
        description:
          "Dasar-Dasar Menggambar; Tipografi Nusantara; Dasar-Dasar Fotografi; Teori Visual; Nirmana; Ilustrasi; Semiotika Visual; Riset Desain. Mata kuliah lanjutan mencakup Prinsip Desain UI/UX, Desain Kemasan, Media Baru Digital, dan Desain Situs Web.",
      },
      {
        title: "Profil lulusan yang dipublikasikan",
        description:
          "Desainer Buku, Ilustrator, Graphic designer, Motion designer, Video editor, dan Animator.",
      },
    ],
    graduates:
      "Profil mengacu pada halaman resmi program studi, bukan jaminan pekerjaan.",
    sources: officialSources,
  },
};
