const AppError = require("../utils/AppError");

const SETTINGS_TABLE = "payment_guide_settings";
const VA_STEPS_TABLE = "payment_va_steps";
const CHANNELS_TABLE = "payment_channels";

const DEFAULT_PAYMENT_SETTINGS = {
  heroEyebrow: "INFORMASI PEMBAYARAN",
  heroTitle: "Cara Pembayaran",
  heroDescription:
    "Ikuti panduan berikut untuk membuat kode Virtual Account dari SiAkad dan membayar tagihan kuliah melalui berbagai kanal pembayaran.",
  vaSectionEyebrow: "PANDUAN SIAKAD",
  vaSectionTitle: "Generated kode bayar atau Virtual Account (VA)",
  vaSectionDescription:
    "Buat kode pembayaran melalui menu Riwayat Keuangan di sistem informasi akademik.",
  vaImage1Url: "/Screenshot%20from%202026-11-10%2009-21-35.png",
  vaImage1Alt: "Menu profil SiAkad dengan pilihan Tagihan Mahasiswa",
  vaImage1Caption: "Buka menu profil, lalu pilih Tagihan Mahasiswa untuk melihat tagihan.",
  vaImage2Url: "/Screenshot%20from%202026-11-10%2009-21-49.png",
  vaImage2Alt: "Halaman Riwayat Keuangan dengan metode pembayaran Mandiri dan tombol Bayar Tagihan",
  vaImage2Caption: "Pada halaman keuangan, pilih metode pembayaran dan klik Bayar Tagihan.",
  methodsSectionEyebrow: "PILIH KANAL PEMBAYARAN",
  methodsSectionTitle: "Panduan pembayaran",
  methodsSectionDescription:
    "Gunakan kode bayar atau nomor Virtual Account yang sudah diterbitkan melalui SiAkad.",
};

const DEFAULT_VA_STEPS = [
  {
    id: "default-va-1",
    title: "Login SiAkad",
    description: "Login pada sistem informasi akademik kampus.",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-va-2",
    title: "Pilih menu Riwayat Keuangan",
    description: "Klik profil, lalu pilih Riwayat Keuangan.",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-va-3",
    title: "Pilih tagihan",
    description: "Centang pada tagihan yang ingin dibayar.",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-va-4",
    title: "Klik Generated Virtual Account",
    description: "Klik tombol Generated Virtual Account.",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-va-5",
    title: "Berhasil mendapat Virtual Account",
    description:
      "Simpan kode VA yang didapatkan dan bayarkan sebelum jatuh tempo (expired kode pembayaran).",
    sortOrder: 5,
    status: "published",
  },
];

const DEFAULT_CHANNELS = [
  {
    id: "default-chan-1",
    channelId: "atm-mandiri",
    name: "Pembayaran melalui ATM Mandiri",
    steps: [
      "Masukkan kartu ATM dan PIN.",
      "Pilih menu BAYAR/BELI, lalu pilih menu LAINNYA → Multipayment.",
      "Masukkan kode perusahaan/institusi, yaitu 89631 atau EDUFIN dari Kode Virtual Account (VA) pada Sistem Informasi Akademik (SIAKAD). Contoh: 8963157000001.",
      "Konfirmasi: tekan 1, kemudian tekan OK.",
      "Transaksi selesai.",
      "Simpan struk pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 1,
    status: "published",
  },
  {
    id: "default-chan-2",
    channelId: "livin-mandiri",
    name: "Pembayaran melalui Livin’ by Mandiri",
    steps: [
      "Login pada aplikasi Livin’ by Mandiri.",
      "Pilih menu BAYAR/VA.",
      "Pilih menu PENDIDIKAN.",
      "Ketik nama biller “EDUFIN” atau ketik kode biller “89631”.",
      "Input KODE BAYAR atau Nomor VA yang didapatkan dari Sistem Informasi Akademik. Contoh: 8963157000001, lalu klik lanjutkan.",
      "Periksa kembali detail transaksi. Jika sudah benar, klik Lanjut Bayar.",
      "Pembayaran selesai. Struk bukti bayar dapat di-share dan di-download sebagai bukti pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 2,
    status: "published",
  },
  {
    id: "default-chan-3",
    channelId: "cabang-mandiri",
    name: "Pembayaran melalui Cabang Mandiri",
    steps: [
      "Ambil aplikasi setoran/transfer/kliring/inkaso dan isikan tanggal sesuai dengan tanggal pada saat melakukan transaksi.",
      "Beri tanda pada kolom: Setoran ke Rekening Sendiri jika sumber dana tunai, atau Transfer jika sumber dana dari rekening.",
      "Beri tanda pada kolom “Penduduk” jika penerima dan pengirim adalah penduduk Indonesia.",
      "Isi nama pengirim sesuai dengan nama penyetor.",
      "Isi nama penerima dengan 89631 atau EduFin.",
      "Isi nama Bank dengan BANK MANDIRI.",
      "Pada nomor rekening, isi dengan Kode Virtual Account (VA) dari Sistem Informasi Akademik (SIAKAD). Contoh: 8963157000001.",
      "Beri tanda pada sumber dana transaksi (tunai/debet rekening).",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 3,
    status: "published",
  },
  {
    id: "default-chan-4",
    channelId: "mobile-banking-bank-lain",
    name: "Pembayaran melalui Mobile Banking bank lain",
    steps: [
      "Login aplikasi mobile banking.",
      "Pilih menu TRANSFER KE BANK LAIN / ANTAR BANK (ONLINE).",
      "Pilih bank tujuan MANDIRI.",
      "Input KODE BAYAR/VA pada rekening tujuan. Contoh: 8963100000001.",
      "Input NOMINAL PEMBAYARAN sesuai dengan tagihan pada Sistem Informasi Akademik (SIAKAD).",
      "Pilih layanan atau metode transfer ONLINE.",
      "Klik LANJUTKAN.",
      "Apabila transaksi telah berhasil, STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran.",
    ],
    note: "Pastikan memilih metode/layanan transfer dengan jenis ONLINE (BUKAN RTGS dan BUKAN BI FAST).",
    technicalNoteTitle: "Ketentuan nominal pembayaran",
    technicalNote:
      "Saat menginput nominal tagihan pada Mobile Banking bank lain, pastikan nominal yang diinput hanya nominal tagihan saja. Abaikan biaya administrasi sebesar Rp4.000.",
    sortOrder: 4,
    status: "published",
  },
  {
    id: "default-chan-5",
    channelId: "atm-bank-lain",
    name: "Pembayaran melalui ATM bank lain",
    steps: [
      "Pilih menu TRANSFER BANK LAIN atau TRANSFER ONLINE ANTAR BANK.",
      "Masukkan kode bank MANDIRI (008) atau pilih bank yang dituju, yaitu MANDIRI.",
      "Masukkan KODE BAYAR (Nomor Virtual Account) pada kolom rekening tujuan. Contoh: 8963100000001.",
      "Masukkan NOMINAL transfer sesuai tagihan yang tampil pada Sistem Informasi Akademik (SIAKAD).",
      "Konfirmasi pembayaran akan tampil pada layar. Apabila sudah sesuai, silakan lanjutkan hingga selesai.",
      "Transaksi sukses dan STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 5,
    status: "published",
  },
];

const serializePaymentSettings = (row) => {
  if (!row) {
    return {
      id: "main",
      ...DEFAULT_PAYMENT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id || "main",
    heroEyebrow: row.hero_eyebrow ?? DEFAULT_PAYMENT_SETTINGS.heroEyebrow,
    heroTitle: row.hero_title ?? DEFAULT_PAYMENT_SETTINGS.heroTitle,
    heroDescription: row.hero_description ?? DEFAULT_PAYMENT_SETTINGS.heroDescription,
    vaSectionEyebrow: row.va_section_eyebrow ?? DEFAULT_PAYMENT_SETTINGS.vaSectionEyebrow,
    vaSectionTitle: row.va_section_title ?? DEFAULT_PAYMENT_SETTINGS.vaSectionTitle,
    vaSectionDescription: row.va_section_description ?? DEFAULT_PAYMENT_SETTINGS.vaSectionDescription,
    vaImage1Url: row.va_image_1_url ?? DEFAULT_PAYMENT_SETTINGS.vaImage1Url,
    vaImage1Alt: row.va_image_1_alt ?? DEFAULT_PAYMENT_SETTINGS.vaImage1Alt,
    vaImage1Caption: row.va_image_1_caption ?? DEFAULT_PAYMENT_SETTINGS.vaImage1Caption,
    vaImage2Url: row.va_image_2_url ?? DEFAULT_PAYMENT_SETTINGS.vaImage2Url,
    vaImage2Alt: row.va_image_2_alt ?? DEFAULT_PAYMENT_SETTINGS.vaImage2Alt,
    vaImage2Caption: row.va_image_2_caption ?? DEFAULT_PAYMENT_SETTINGS.vaImage2Caption,
    methodsSectionEyebrow: row.methods_section_eyebrow ?? DEFAULT_PAYMENT_SETTINGS.methodsSectionEyebrow,
    methodsSectionTitle: row.methods_section_title ?? DEFAULT_PAYMENT_SETTINGS.methodsSectionTitle,
    methodsSectionDescription: row.methods_section_description ?? DEFAULT_PAYMENT_SETTINGS.methodsSectionDescription,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

const serializeVaStep = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title,
    description: row.description,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) out.status = row.status || "draft";
  return out;
};

const serializeChannel = (row, options = {}) => {
  const { includeStatus = true } = options;
  if (!row) return null;

  let steps = [];
  if (Array.isArray(row.steps)) {
    steps = row.steps.map((s) => (typeof s === "string" ? s : String(s || "")));
  } else if (typeof row.steps === "string") {
    try {
      const parsed = JSON.parse(row.steps);
      if (Array.isArray(parsed)) {
        steps = parsed.map((s) => (typeof s === "string" ? s : String(s || "")));
      }
    } catch {
      steps = [];
    }
  }

  const out = {
    id: row.id,
    channelId: row.channel_id ?? row.channelId,
    name: row.name,
    steps,
    note: row.note ?? null,
    technicalNoteTitle: row.technical_note_title ?? row.technicalNoteTitle ?? null,
    technicalNote: row.technical_note ?? row.technicalNote ?? null,
    sortOrder: typeof (row.sort_order ?? row.sortOrder) === "number" ? (row.sort_order ?? row.sortOrder) : 0,
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
  VA_STEPS_TABLE,
  CHANNELS_TABLE,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_VA_STEPS,
  DEFAULT_CHANNELS,
  serializePaymentSettings,
  serializeVaStep,
  serializeChannel,
  itemNotFound,
};
