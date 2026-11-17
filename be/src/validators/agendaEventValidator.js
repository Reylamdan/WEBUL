const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");
const { AGENDA_CATEGORY_SLUGS } = require("../utils/agendaCategories");

// Batas ini mengikuti constraint di tabel agenda_events (lihat supabase/migrations/20261117_agenda_events.sql)
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const LOCATION_MAX = 200;
const ORGANIZER_MAX = 150;
const URL_MAX = 500;
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const STATUSES = ["draft", "published"];

const strictBody = (shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  });

const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

// "2026-02-30" lolos regex tetapi bukan tanggal nyata: cek lewat pembuatan ulang tanggal UTC.
const isRealDate = (value) => {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const dateString = (label) =>
  z
    .string({ error: `${label} wajib diisi dengan format YYYY-MM-DD` })
    .trim()
    .regex(DATE_PATTERN, `${label} harus berformat YYYY-MM-DD`)
    .refine(isRealDate, `${label} bukan tanggal yang valid`)
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= YEAR_MIN && year <= YEAR_MAX;
    }, `Tahun pada ${label.toLowerCase()} harus antara ${YEAR_MIN} dan ${YEAR_MAX}`);

// Jam opsional. undefined = tidak dikirim; null / "" = dikosongkan.
const timeField = (label) =>
  z
    .union([z.null(), z.string({ error: `${label} harus berupa teks HH:MM` })])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .pipe(z.string().regex(TIME_PATTERN, `${label} harus berformat HH:MM (00:00 - 23:59)`).nullable().optional());

// Teks polos satu baris opsional (lokasi, penyelenggara). undefined = tidak dikirim; null / "" = dikosongkan.
const optionalLine = (label, max) =>
  z
    .union([z.null(), z.string({ error: `${label} harus berupa teks` })])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      return toPlainText(value) || null;
    })
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`).nullable().optional());

const plainMultiline = (input) =>
  String(input)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(toPlainText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const titleField = z
  .string({ error: "Judul wajib diisi" })
  .transform(toPlainText)
  .pipe(
    z
      .string()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

const descriptionField = z
  .union([z.null(), z.string({ error: "Deskripsi harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return plainMultiline(value) || null;
  })
  .pipe(z.string().max(DESCRIPTION_MAX, `Deskripsi maksimal ${DESCRIPTION_MAX} karakter`).nullable().optional());

// Hanya http/https agar tidak bisa menyisipkan javascript: atau data: URL ke tombol pendaftaran.
const registrationUrlField = z
  .union([z.null(), z.string({ error: "Tautan pendaftaran harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  })
  .pipe(
    z
      .string()
      .max(URL_MAX, `Tautan pendaftaran maksimal ${URL_MAX} karakter`)
      .refine((value) => {
        try {
          const { protocol } = new URL(value);
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      }, "Tautan pendaftaran harus berupa URL http:// atau https:// yang valid")
      .nullable()
      .optional()
  );

const categoryField = z.enum(AGENDA_CATEGORY_SLUGS, {
  error: `Kategori tidak dikenal. Pilihan: ${AGENDA_CATEGORY_SLUGS.join(", ")}`,
});

const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });

const endNotBeforeStart = (value) => !(value.startDate && value.endDate) || value.endDate >= value.startDate;
const endNotBeforeStartOptions = { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai", path: ["endDate"] };

// Pada acara satu hari, jam selesai tidak boleh lebih awal dari jam mulai.
const endTimeNotBeforeStartTime = (value) =>
  !(value.startDate && value.endDate && value.startDate === value.endDate && value.startTime && value.endTime) ||
  value.endTime >= value.startTime;
const endTimeOptions = { error: "Jam selesai tidak boleh lebih awal dari jam mulai", path: ["endTime"] };

// ---------- Params ----------
const eventIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID acara tidak valid"),
});

// ---------- Query ----------
const pageField = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Halaman harus berupa angka" })
    .int("Halaman harus berupa bilangan bulat")
    .min(1, "Halaman minimal 1")
    .max(100000, "Halaman terlalu besar")
    .default(1)
);

const limitField = (defaultValue) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Limit harus berupa angka" })
      .int("Limit harus berupa bilangan bulat")
      .min(1, "Limit minimal 1")
      .max(100, "Maksimal 100 data per halaman")
      .default(defaultValue)
  );

const categoryQueryField = z.preprocess(emptyToUndefined, categoryField.optional());
const fromField = z.preprocess(emptyToUndefined, dateString("Tanggal awal (from)").optional());
const toField = z.preprocess(emptyToUndefined, dateString("Tanggal akhir (to)").optional());
const searchField = z.preprocess(
  emptyToUndefined,
  z.string({ error: "Kata kunci harus berupa teks" }).trim().max(100, "Kata kunci maksimal 100 karakter").optional()
);

const fromNotAfterTo = (value) => !(value.from && value.to) || value.from <= value.to;
const fromNotAfterToOptions = { error: "Tanggal awal (from) tidak boleh lebih akhir dari tanggal akhir (to)", path: ["to"] };

const listEventsQuerySchema = z
  .object({
    page: pageField,
    limit: limitField(20),
    status: z.preprocess(emptyToUndefined, statusField.optional()),
    category: categoryQueryField,
    from: fromField,
    to: toField,
    search: searchField,
  })
  .refine(fromNotAfterTo, fromNotAfterToOptions);

// Publik: tidak ada filter status karena publik HANYA melihat published.
// Parameter yang tidak dikenal (mis. ?status=draft) diabaikan, bukan dipakai.
const publicListEventsQuerySchema = z
  .object({
    page: pageField,
    limit: limitField(50),
    category: categoryQueryField,
    from: fromField,
    to: toField,
    search: searchField,
  })
  .refine(fromNotAfterTo, fromNotAfterToOptions);

// ---------- Body ----------
const createEventSchema = strictBody({
  title: titleField,
  description: descriptionField,
  startDate: dateString("Tanggal mulai"),
  endDate: dateString("Tanggal selesai"),
  startTime: timeField("Jam mulai"),
  endTime: timeField("Jam selesai"),
  location: optionalLine("Lokasi", LOCATION_MAX),
  organizer: optionalLine("Penyelenggara", ORGANIZER_MAX),
  registrationUrl: registrationUrlField,
  category: categoryField,
  status: statusField.optional(),
})
  .refine(endNotBeforeStart, endNotBeforeStartOptions)
  .refine(endTimeNotBeforeStartTime, endTimeOptions);

const updateEventSchema = strictBody({
  title: titleField.optional(),
  description: descriptionField,
  startDate: dateString("Tanggal mulai").optional(),
  endDate: dateString("Tanggal selesai").optional(),
  startTime: timeField("Jam mulai"),
  endTime: timeField("Jam selesai"),
  location: optionalLine("Lokasi", LOCATION_MAX),
  organizer: optionalLine("Penyelenggara", ORGANIZER_MAX),
  registrationUrl: registrationUrlField,
  category: categoryField.optional(),
  status: statusField.optional(),
})
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Minimal satu field harus dikirim untuk memperbarui acara"
  )
  .refine(endNotBeforeStart, endNotBeforeStartOptions)
  .refine(endTimeNotBeforeStartTime, endTimeOptions);

module.exports = {
  eventIdParamsSchema,
  listEventsQuerySchema,
  publicListEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
};