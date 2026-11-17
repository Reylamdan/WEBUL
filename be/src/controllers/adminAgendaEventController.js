const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { removeCoverObjectQuietly } = require("../utils/coverStorage");
const { AGENDA_CATEGORIES } = require("../utils/agendaCategories");
const {
  TABLE,
  EVENT_COLUMNS,
  serializeEvent,
  applyEventFilters,
  eventNotFound,
} = require("../services/agendaEventService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const findEventById = async (id, context) => {
  const { data, error } = await supabase.from(TABLE).select(EVENT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

// Pelanggaran constraint yang lolos dari validasi aplikasi dikembalikan sebagai 400 umum,
// bukan 500 dengan detail database.
const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

const hm = (value) => (value ? String(value).slice(0, 5) : null);

// ---------------------------------------------------------------------
// GET /api/admin/agenda-events/categories
// ---------------------------------------------------------------------
const listCategories = async (req, res) =>
  res.json({
    success: true,
    data: { categories: AGENDA_CATEGORIES.map(({ slug, name, description }) => ({ slug, name, description })) },
  });

// ---------------------------------------------------------------------
// GET /api/admin/agenda-events
// ---------------------------------------------------------------------
const listEvents = async (req, res) => {
  const { page, limit, status, category, from: fromDate, to: toDate, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = applyEventFilters(query, { category, from: fromDate, to: toDate });
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(supabase.from(TABLE).select(EVENT_COLUMNS, { count: "exact" }))
    .order("start_date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("agenda: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("agenda: daftar", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeEvent(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/agenda-events/:id
// ---------------------------------------------------------------------
const getEvent = async (req, res) => {
  const row = await findEventById(req.validated.params.id, "agenda: detail");
  if (!row) throw eventNotFound();
  return res.json({ success: true, data: { event: serializeEvent(row) } });
};

// ---------------------------------------------------------------------
// POST /api/admin/agenda-events
// ---------------------------------------------------------------------
const createEvent = async (req, res) => {
  const b = req.body;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: b.title,
      description: b.description ?? null,
      start_date: b.startDate,
      end_date: b.endDate,
      start_time: b.startTime ?? null,
      end_time: b.endTime ?? null,
      location: b.location ?? null,
      organizer: b.organizer ?? null,
      registration_url: b.registrationUrl ?? null,
      category: b.category,
      status: b.status ?? "draft",
    })
    .select(EVENT_COLUMNS)
    .single();
  if (error) throwWriteError("agenda: buat", error);

  return res.status(201).json({
    success: true,
    message: "Acara berhasil dibuat",
    data: { event: serializeEvent(data) },
  });
};

// ---------------------------------------------------------------------
// PATCH /api/admin/agenda-events/:id
// ---------------------------------------------------------------------
const updateEvent = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const current = await findEventById(id, "agenda: ambil untuk update");
  if (!current) throw eventNotFound();

  // Urutan tanggal/jam diperiksa terhadap nilai gabungan (kiriman + data lama), karena klien boleh
  // mengirim hanya sebagian field.
  const finalStart = body.startDate ?? current.start_date;
  const finalEnd = body.endDate ?? current.end_date;
  if (finalEnd < finalStart) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", [
      { field: "endDate", message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai" },
    ]);
  }
  const finalStartTime = body.startTime !== undefined ? body.startTime : hm(current.start_time);
  const finalEndTime = body.endTime !== undefined ? body.endTime : hm(current.end_time);
  if (finalStart === finalEnd && finalStartTime && finalEndTime && finalEndTime < finalStartTime) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", [
      { field: "endTime", message: "Jam selesai tidak boleh lebih awal dari jam mulai" },
    ]);
  }

  const patch = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.startDate !== undefined) patch.start_date = body.startDate;
  if (body.endDate !== undefined) patch.end_date = body.endDate;
  if (body.startTime !== undefined) patch.start_time = body.startTime;
  if (body.endTime !== undefined) patch.end_time = body.endTime;
  if (body.location !== undefined) patch.location = body.location;
  if (body.organizer !== undefined) patch.organizer = body.organizer;
  if (body.registrationUrl !== undefined) patch.registration_url = body.registrationUrl;
  if (body.category !== undefined) patch.category = body.category;
  if (body.status !== undefined) patch.status = body.status;

  const normalize = (key, value) => (key === "start_time" || key === "end_time" ? hm(value) : value ?? null);
  const changed = Object.keys(patch).filter((key) => normalize(key, patch[key]) !== normalize(key, current[key]));
  if (changed.length === 0) {
    return res.json({ success: true, message: "Tidak ada perubahan", data: { event: serializeEvent(current) } });
  }

  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select(EVENT_COLUMNS).maybeSingle();
  if (error) throwWriteError("agenda: perbarui", error);
  if (!data) throw eventNotFound();

  return res.json({ success: true, message: "Acara berhasil diperbarui", data: { event: serializeEvent(data) } });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/agenda-events/:id
// ---------------------------------------------------------------------
const deleteEvent = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id, image_path");
  if (error) throwDbError("agenda: hapus", error);
  if (!data || data.length === 0) throw eventNotFound();

  // Row sudah terhapus; file gambar dibersihkan setelahnya (kegagalan hanya dicatat).
  await removeCoverObjectQuietly(data[0].image_path, "deleteEvent: hapus file gambar agenda");

  return res.json({ success: true, message: "Acara berhasil dihapus" });
};

module.exports = { listCategories, listEvents, getEvent, createEvent, updateEvent, deleteEvent };