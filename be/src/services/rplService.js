const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "rpl_settings";
const STEPS_TABLE = "rpl_steps";
const REQUIREMENTS_TABLE = "rpl_requirements";
const SCHEDULES_TABLE = "rpl_schedules";
const FEES_TABLE = "rpl_fees";

const DEFAULT_RPL_SETTINGS = {
  heroEyebrow: "JALUR PENERIMAAN MAHASISWA BARU",
  heroTitle: "Raih Sarjana dengan Pengalaman Kerja",
  heroDescription:
    "Merupakan jalur penerimaan mahasiswa baru yang memberikan kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan atas pembelajaran yang telah diperoleh sebelumnya, baik melalui pengalaman kerja, pendidikan formal, informal, maupun nonformal",
  heroArtMark: "RPL",
  heroArtCaption: "PENGALAMANMU\nPUNYA NILAI",
  sectionEyebrow: "JALUR RPL",
  sectionTitle: "Rekognisi Pembelajaran Lampau (RPL)",
  benefits: ["Lulus lebih cepat", "Kuliah fleksibel", "Hemat biaya"],
  scheduleNote: "Awal perkuliahan dilaksanakan bulan September 2026 pada:",
  registrationDeadline: "31 Juli 2026",
  registrationUrl: "https://pmb.universitaslia.ac.id/home",
  transferCreditTitle: "Transfer Kredit",
  transferCreditDescription:
    "Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil evaluasi terhadap pendidikan dan capaian pembelajaran sebelumnya.",
};

const DEFAULT_RPL_STEPS = [
  {
    id: "default-step-1",
    title: "Mengisi formulir RPL",
    description: "Lengkapi formulir pendaftaran dan berkas pendukung.",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-step-2",
    title: "Melakukan pembayaran asesmen",
    description: "Selesaikan pembayaran sesuai instruksi pendaftaran.",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-step-3",
    title: "Verifikasi formulir dan berkas",
    description: "Berkas pendaftaran akan diperiksa oleh tim terkait.",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-step-4",
    title: "Mengikuti wawancara dan tes asesmen",
    description: "Ikuti proses asesmen sesuai jadwal yang diberikan.",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-step-5",
    title: "Pengumuman hasil asesmen",
    description: "Periksa hasil asesmen melalui informasi dari tim PMB.",
    sortOrder: 5,
    status: "published",
  },
  {
    id: "default-step-6",
    title: "Melakukan daftar ulang",
    description: "Selesaikan daftar ulang untuk melanjutkan proses penerimaan.",
    sortOrder: 6,
    status: "published",
  },
];

const DEFAULT_RPL_REQUIREMENTS = [
  {
    id: "default-req-1",
    type: "syarat",
    title:
      "Lulusan SMA/SMK/MA sederajat yang memiliki pengalaman kerja di bidang yang relevan dengan program studi yang akan ditempuh",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-req-2",
    type: "syarat",
    title: "Membayar biaya pendaftaran Rp100.000",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-req-3",
    type: "syarat",
    title: "Memiliki sertifikat pelatihan atau bukti pengalaman kerja yang relevan",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-req-4",
    type: "syarat",
    title: "Mengikuti asesmen tes",
    sortOrder: 4,
    status: "published",
  },
  { id: "default-doc-1", type: "dokumen", title: "KTP", sortOrder: 1, status: "published" },
  { id: "default-doc-2", type: "dokumen", title: "Akta kelahiran", sortOrder: 2, status: "published" },
  { id: "default-doc-3", type: "dokumen", title: "Kartu keluarga", sortOrder: 3, status: "published" },
  { id: "default-doc-4", type: "dokumen", title: "Ijazah", sortOrder: 4, status: "published" },
  { id: "default-doc-5", type: "dokumen", title: "Foto background merah", sortOrder: 5, status: "published" },
  {
    id: "default-doc-6",
    type: "dokumen",
    title: "Daftar Riwayat pekerjaan dengan rincian tugas yang dilakukan",
    sortOrder: 6,
    status: "published",
  },
  { id: "default-doc-7", type: "dokumen", title: "Sertifikat Kompetensi", sortOrder: 7, status: "published" },
  {
    id: "default-doc-8",
    type: "dokumen",
    title: "Sertifikat pengoperasian/lisensi yang dimiliki (misalnya, sertifikat pengajaran, dsb.)",
    sortOrder: 8,
    status: "published",
  },
  {
    id: "default-doc-9",
    type: "dokumen",
    title: "Dokumentasi pekerjaan yang pernah dilakukan (foto/video/produk/hasil tes, dll)",
    sortOrder: 9,
    status: "published",
  },
  {
    id: "default-doc-10",
    type: "dokumen",
    title: "Buku harian/catatan harian pekerjaan yang dilakukan di tempat kerja",
    sortOrder: 10,
    status: "published",
  },
  {
    id: "default-doc-11",
    type: "dokumen",
    title: "Lembar tugas / lembar kerja ketika bekerja di perusahaan",
    sortOrder: 11,
    status: "published",
  },
  {
    id: "default-doc-12",
    type: "dokumen",
    title: "Dokumen analisis/perancangan (parsial atau lengkap) ketika bekerja di perusahaan",
    sortOrder: 12,
    status: "published",
  },
  { id: "default-doc-13", type: "dokumen", title: "Logbook (Buku Catatan pekerjaan)", sortOrder: 13, status: "published" },
  {
    id: "default-doc-14",
    type: "dokumen",
    title: "Sertifikat Pelatihan disertai dengan uraian materi pelatihan dan lamanya pelatihan",
    sortOrder: 14,
    status: "published",
  },
  {
    id: "default-doc-15",
    type: "dokumen",
    title: "Keanggotaan asosiasi profesi yang relevan",
    sortOrder: 15,
    status: "published",
  },
  {
    id: "default-doc-16",
    type: "dokumen",
    title: "Referensi/surat keterangan/laporan verifikasi pihak ketiga dari pemberi kerja/supervisor",
    sortOrder: 16,
    status: "published",
  },
  { id: "default-doc-17", type: "dokumen", title: "Penghargaan dari industri", sortOrder: 17, status: "published" },
  { id: "default-doc-18", type: "dokumen", title: "Penilaian kinerja dari perusahaan.", sortOrder: 18, status: "published" },
];

const DEFAULT_RPL_SCHEDULES = [
  { id: "default-sched-1", day: "Kamis", hours: "16:00 - 22:00 WIB", sortOrder: 1, status: "published" },
  { id: "default-sched-2", day: "Jumat", hours: "16:00 - 22:00 WIB", sortOrder: 2, status: "published" },
  { id: "default-sched-3", day: "Sabtu", hours: "08:00 - 20:00 WIB", sortOrder: 3, status: "published" },
];

const DEFAULT_RPL_FEES = [
  { id: "default-fee-1", type: "Pendaftaran", amount: "Rp100.000", sortOrder: 1, status: "published" },
  { id: "default-fee-2", type: "Asesmen", amount: "Rp3.000.000", sortOrder: 2, status: "published" },
  { id: "default-fee-3", type: "Kuliah", amount: "Rp4.500.000", sortOrder: 3, status: "published" },
];

const serializeRplSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_RPL_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let benefits = DEFAULT_RPL_SETTINGS.benefits;
  if (Array.isArray(row.benefits)) {
    benefits = row.benefits;
  } else if (typeof row.benefits === "string") {
    try {
      const parsed = JSON.parse(row.benefits);
      if (Array.isArray(parsed)) benefits = parsed;
    } catch {
      benefits = DEFAULT_RPL_SETTINGS.benefits;
    }
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_RPL_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_RPL_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_RPL_SETTINGS.heroDescription,
    heroArtMark: row.hero_art_mark ?? DEFAULT_RPL_SETTINGS.heroArtMark,
    heroArtCaption: row.hero_art_caption ?? DEFAULT_RPL_SETTINGS.heroArtCaption,
    sectionEyebrow: row.section_eyebrow ?? DEFAULT_RPL_SETTINGS.sectionEyebrow,
    sectionTitle: row.section_title ?? DEFAULT_RPL_SETTINGS.sectionTitle,
    benefits,
    scheduleNote: row.schedule_note ?? DEFAULT_RPL_SETTINGS.scheduleNote,
    registrationDeadline: row.registration_deadline ?? DEFAULT_RPL_SETTINGS.registrationDeadline,
    registrationUrl: row.registration_url ?? DEFAULT_RPL_SETTINGS.registrationUrl,
    transferCreditTitle: row.transfer_credit_title ?? DEFAULT_RPL_SETTINGS.transferCreditTitle,
    transferCreditDescription: row.transfer_credit_description ?? DEFAULT_RPL_SETTINGS.transferCreditDescription,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeStep = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title,
    description: row.description,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const serializeRequirement = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    type: row.type,
    title: row.title,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const serializeSchedule = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    day: row.day,
    hours: row.hours,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const serializeFee = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    type: row.type,
    amount: row.amount,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const itemNotFound = (entity, id) =>
  new AppError(`${entity} dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  STEPS_TABLE,
  REQUIREMENTS_TABLE,
  SCHEDULES_TABLE,
  FEES_TABLE,
  DEFAULT_RPL_SETTINGS,
  DEFAULT_RPL_STEPS,
  DEFAULT_RPL_REQUIREMENTS,
  DEFAULT_RPL_SCHEDULES,
  DEFAULT_RPL_FEES,
  serializeRplSettings,
  serializeStep,
  serializeRequirement,
  serializeSchedule,
  serializeFee,
  itemNotFound,
};

