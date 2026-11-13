// Status kedaluwarsa akreditasi, dihitung dari kolom valid_until (TANPA kolom database baru).
//
// Aturan (valid_until = HARI TERAKHIR akreditasi masih berlaku, inklusif):
//   unknown  : valid_until kosong (null)
//   expired  : valid_until <  hari ini            (sudah lewat sejak kemarin)
//   expiring : hari ini <= valid_until <= hari ini + 90 hari
//   active   : valid_until >  hari ini + 90 hari
//
// Jadi data yang valid_until-nya HARI INI masih "expiring" (berlaku sampai akhir hari ini),
// dan baru menjadi "expired" besok. Perbandingan dilakukan pada string tanggal YYYY-MM-DD
// (kolom bertipe date, tanpa jam), sehingga tidak ada pergeseran akibat zona waktu server.
//
// "Hari ini" ditentukan menurut zona waktu bisnis (default Asia/Jakarta, bisa diubah lewat
// ACCREDITATION_TIMEZONE), bukan zona waktu server. Server di cloud biasanya UTC, sehingga
// tanpa ini status berganti 7 jam lebih lambat dari tengah malam WIB.

const DEFAULT_TIMEZONE = "Asia/Jakarta";
const EXPIRING_DAYS = 90;
const EXPIRY_STATUSES = ["active", "expiring", "expired", "unknown"];

const isValidTimezone = (tz) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const resolveTimezone = () => {
  const configured = (process.env.ACCREDITATION_TIMEZONE || "").trim();
  return configured && isValidTimezone(configured) ? configured : DEFAULT_TIMEZONE;
};

// Tanggal hari ini (YYYY-MM-DD) menurut zona waktu bisnis.
const getToday = (now = new Date(), timeZone = resolveTimezone()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const toUtcMs = (isoDate) => Date.parse(`${isoDate}T00:00:00.000Z`);

// Tambah/kurang hari pada string YYYY-MM-DD (aritmatika kalender murni, aman dari DST).
const addDays = (isoDate, days) =>
  new Date(toUtcMs(isoDate) + days * MS_PER_DAY).toISOString().slice(0, 10);

// Batas tanggal yang dipakai query: today dan today + 90 hari.
const getExpiryBoundaries = (now = new Date()) => {
  const today = getToday(now);
  return { today, expiringUntil: addDays(today, EXPIRING_DAYS) };
};

const normalizeDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

const computeExpiryStatus = (validUntil, now = new Date()) => {
  const date = normalizeDate(validUntil);
  if (!date) return "unknown";
  const { today, expiringUntil } = getExpiryBoundaries(now);
  if (date < today) return "expired";
  if (date <= expiringUntil) return "expiring";
  return "active";
};

// Sisa hari sampai valid_until (negatif jika sudah lewat); null jika tanggal kosong.
const computeDaysUntilExpiry = (validUntil, now = new Date()) => {
  const date = normalizeDate(validUntil);
  if (!date) return null;
  return Math.round((toUtcMs(date) - toUtcMs(getToday(now))) / MS_PER_DAY);
};

module.exports = {
  EXPIRING_DAYS,
  EXPIRY_STATUSES,
  getToday,
  addDays,
  getExpiryBoundaries,
  computeExpiryStatus,
  computeDaysUntilExpiry,
};
