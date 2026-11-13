const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

// Batas ini mengikuti constraint di tabel academic_calendar_events
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const STATUSES = ["draft", "published"];

// Field di luar skema (mis. id, createdAt) ditolak agar klien tidak menyisipkan data yang diatur server.
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

// ---------- Field ----------
const titleField = z
  .string({ error: "Judul wajib diisi" })
  .transform(toPlainText)
  .pipe(
    z
      .string()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
  );

// Deskripsi: teks polos (tag HTML dibuang), baris baru dipertahankan.
//   undefined -> tidak dikirim (create: kosong, update: nilai lama dipertahankan)
//   null / "" -> dikosongkan (disimpan null)
const plainMultiline = (input) =>
  String(input)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(toPlainText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const descriptionField = z
  .union([z.null(), z.string({ error: "Deskripsi harus berupa teks" })])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return plainMultiline(value) || null;
  })
  .pipe(z.string().max(DESCRIPTION_MAX, `Deskripsi maksimal ${DESCRIPTION_MAX} karakter`).nullable().optional());

// Hanya validasi bentuk. Apakah kategori terdaftar & aktif diperiksa di controller terhadap tabel kategori.
const categoryField = z
  .string({ error: "Kategori wajib diisi" })
  .trim()
  .toLowerCase()
  .min(1, "Kategori wajib diisi")
  .max(60, "Kategori maksimal 60 karakter")
  .regex(CATEGORY_PATTERN, "Kategori hanya boleh huruf kecil, angka, dan tanda hubung (contoh: uts)");

const statusField = z.enum(STATUSES, { error: "Status harus draft atau published" });

const endNotBeforeStart = (value) => !(value.startDate && value.endDate) || value.endDate >= value.startDate;
const endNotBeforeStartOptions = { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai", path: ["endDate"] };

// ---------- Params ----------
const eventIdParamsSchema = z.object({
  id: z.string().regex(UUID_PATTERN, "ID agenda tidak valid"),
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

const fromNotAfterTo = (value) => !(value.from && value.to) || value.from <= value.to;
const fromNotAfterToOptions = { error: "Tanggal awal (from) tidak boleh lebih akhir dari tanggal akhir (to)", path: ["to"] };

// Filter rentang: agenda yang BERIRISAN dengan [from, to] (mulai <= to DAN selesai >= from).
const listEventsQuerySchema = z
  .object({
    page: pageField,
    limit: limitField(20),
    status: z.preprocess(emptyToUndefined, statusField.optional()),
    category: categoryQueryField,
    from: fromField,
    to: toField,
    search: z.preprocess(
      emptyToUndefined,
      z.string({ error: "Kata kunci harus berupa teks" }).trim().max(100, "Kata kunci maksimal 100 karakter").optional()
    ),
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
  })
  .refine(fromNotAfterTo, fromNotAfterToOptions);

// ---------- Body ----------
const createEventSchema = strictBody({
  title: titleField,
  description: descriptionField,
  startDate: dateString("Tanggal mulai"),
  endDate: dateString("Tanggal selesai"),
  category: categoryField,
  status: statusField.optional(),
}).refine(endNotBeforeStart, endNotBeforeStartOptions);

const updateEventSchema = strictBody({
  title: titleField.optional(),
  description: descriptionField,
  startDate: dateString("Tanggal mulai").optional(),
  endDate: dateString("Tanggal selesai").optional(),
  category: categoryField.optional(),
  status: statusField.optional(),
})
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Minimal satu field harus dikirim untuk memperbarui agenda"
  )
  .refine(endNotBeforeStart, endNotBeforeStartOptions);

module.exports = {
  eventIdParamsSchema,
  listEventsQuerySchema,
  publicListEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
};
