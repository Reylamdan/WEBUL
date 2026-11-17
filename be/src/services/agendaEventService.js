const AppError = require("../utils/AppError");
const { AGENDA_CATEGORY_MAP } = require("../utils/agendaCategories");
const { getCoverPublicUrl } = require("../utils/coverStorage");

const TABLE = "agenda_events";

const EVENT_COLUMNS =
  "id, title, description, start_date, end_date, start_time, end_time, location, organizer, " +
  "registration_url, category, status, image_path, created_at, updated_at";

// Postgres mengembalikan kolom time sebagai "HH:MM:SS"; API memakai "HH:MM".
const toHourMinute = (value) => (value ? String(value).slice(0, 5) : null);

// Row database (snake_case) -> response API (camelCase).
// includeStatus=false untuk respons publik (publik hanya melihat published).
const serializeEvent = (row, { includeStatus = true } = {}) => {
  const category = AGENDA_CATEGORY_MAP.get(row.category);
  const event = {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: toHourMinute(row.start_time),
    endTime: toHourMinute(row.end_time),
    location: row.location ?? null,
    organizer: row.organizer ?? null,
    registrationUrl: row.registration_url ?? null,
    category: { slug: row.category, name: category ? category.name : row.category },
    // Opsional: null bila acara tidak punya gambar (frontend memakai tampilan tanpa gambar).
    imageUrl: getCoverPublicUrl(row.image_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) event.status = row.status;
  return event;
};

// Filter bersama untuk daftar admin & publik. Rentang tanggal memakai irisan:
// acara tampil jika mulai <= to DAN selesai >= from (acara multi-hari yang menyentuh rentang ikut tampil).
const applyEventFilters = (query, { category, from, to }) => {
  let filtered = query;
  if (category) filtered = filtered.eq("category", category);
  if (to) filtered = filtered.lte("start_date", to);
  if (from) filtered = filtered.gte("end_date", from);
  return filtered;
};

const eventNotFound = () => new AppError("Acara tidak ditemukan", 404, "AGENDA_EVENT_NOT_FOUND");

module.exports = { TABLE, EVENT_COLUMNS, serializeEvent, applyEventFilters, eventNotFound };