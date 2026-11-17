const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "registration_period_settings";
const WAVES_TABLE = "registration_waves";

const DEFAULT_REGISTRATION_SETTINGS = {
  heroEyebrow: "PENERIMAAN MAHASISWA BARU",
  heroTitle: "Periode Pendaftaran",
  heroDescription:
    "Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA. Pilih gelombang untuk melihat jadwal pendaftaran, tes, dan daftar ulang.",
  sectionEyebrow: "JADWAL PENERIMAAN 2027",
  sectionTitle: "Tahapan pendaftaran",
  sectionDescription:
    "Jadwal di bawah merupakan data contoh dan dapat diperbarui.",
};

const DEFAULT_REGISTRATION_WAVES = [
  {
    id: "default-1",
    name: "Gelombang 1",
    label: "Pendaftaran awal",
    activities: [
      { name: "Pendaftaran", time: "01 Januari – 31 Maret 2027" },
      { name: "Tes dan Wawancara", time: "05 April 2027" },
      { name: "Daftar Ulang", time: "10 April – 20 April 2027" },
    ],
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-2",
    name: "Gelombang 2",
    label: "Pendaftaran lanjutan",
    activities: [
      { name: "Pendaftaran", time: "01 April – 30 Juni 2027" },
      { name: "Tes dan Wawancara", time: "05 Juli 2027" },
      { name: "Daftar Ulang", time: "10 Juli – 20 Juli 2027" },
    ],
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-3",
    name: "Gelombang 3",
    label: "Pendaftaran akhir",
    activities: [
      { name: "Pendaftaran", time: "01 Juli – 30 September 2027" },
      { name: "Tes dan Wawancara", time: "05 Oktober 2027" },
      { name: "Daftar Ulang", time: "10 Oktober – 20 Oktober 2027" },
    ],
    sortOrder: 3,
    status: "published",
  },
];

const serializeRegistrationSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_REGISTRATION_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_REGISTRATION_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_REGISTRATION_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_REGISTRATION_SETTINGS.heroDescription,
    sectionEyebrow: row.section_eyebrow ?? DEFAULT_REGISTRATION_SETTINGS.sectionEyebrow,
    sectionTitle: row.section_title ?? DEFAULT_REGISTRATION_SETTINGS.sectionTitle,
    sectionDescription: row.section_description ?? DEFAULT_REGISTRATION_SETTINGS.sectionDescription,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeRegistrationWave = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;

  let activities = [];
  if (Array.isArray(row.activities)) {
    activities = row.activities.map((a) => ({
      name: typeof a?.name === "string" ? a.name : "",
      time: typeof a?.time === "string" ? a.time : "",
    }));
  } else if (typeof row.activities === "string") {
    try {
      const parsed = JSON.parse(row.activities);
      if (Array.isArray(parsed)) {
        activities = parsed.map((a) => ({
          name: typeof a?.name === "string" ? a.name : "",
          time: typeof a?.time === "string" ? a.time : "",
        }));
      }
    } catch {
      activities = [];
    }
  }

  const out = {
    id: row.id,
    name: row.name,
    label: row.label ?? null,
    activities,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeStatus) {
    out.status = row.status || "draft";
  }

  return out;
};

const waveNotFound = (id) =>
  new AppError(`Gelombang pendaftaran dengan ID ${id} tidak ditemukan`, 404, "NOT_FOUND");

module.exports = {
  SETTINGS_TABLE,
  WAVES_TABLE,
  DEFAULT_REGISTRATION_SETTINGS,
  DEFAULT_REGISTRATION_WAVES,
  serializeRegistrationSettings,
  serializeRegistrationWave,
  waveNotFound,
};

