const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  EVENT_COLUMNS,
  listCategories,
  toCategoryMap,
  serializeEvent,
  assertCategoryUsable,
  assertCategoryKnown,
  applyEventFilters,
  eventNotFound,
} = require("../services/academicCalendarService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

const findEventById = async (id, context) => {
  const { data, error } = await supabase
    .from("academic_calendar_events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

// Pelanggaran constraint yang lolos dari validasi aplikasi (mis. balapan saat kategori dinonaktifkan)
// dikembalikan sebagai 400 umum, bukan 500 dengan detail database.
const throwWriteError = (context, error) => {
  if (error && (error.code === FOREIGN_KEY_VIOLATION || error.code === CHECK_VIOLATION)) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ---------------------------------------------------------------------
// GET /api/admin/academic-calendar
// ---------------------------------------------------------------------
const listEvents = async (req, res) => {
  const { page, limit, status, category, from: fromDate, to: toDate, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const categories = await listCategories("academic calendar admin");
  if (category) assertCategoryKnown(category, categories);

  const applyFilters = (query) => {
    let filtered = applyEventFilters(query, { category, from: fromDate, to: toDate });
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from("academic_calendar_events").select(EVENT_COLUMNS, { count: "exact" })
  )
    .order("start_date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("academic_calendar_events").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("academic calendar: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("academic calendar: daftar", error);

  const total = count ?? 0;
  const categoryMap = toCategoryMap(categories);

  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeEvent(row, categoryMap)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/academic-calendar/:id
// ---------------------------------------------------------------------
const getEvent = async (req, res) => {
  const row = await findEventById(req.validated.params.id, "academic calendar: detail");
  if (!row) throw eventNotFound();

  const categoryMap = toCategoryMap(await listCategories("academic calendar detail"));
  return res.json({ success: true, data: { event: serializeEvent(row, categoryMap) } });
};

// ---------------------------------------------------------------------
// POST /api/admin/academic-calendar
// ---------------------------------------------------------------------
const createEvent = async (req, res) => {
  const { title, description, startDate, endDate, category, status = "draft" } = req.body;

  const categories = await listCategories("academic calendar buat");
  assertCategoryUsable(category, categories);

  const { data, error } = await supabase
    .from("academic_calendar_events")
    .insert({
      title,
      description: description ?? null,
      start_date: startDate,
      end_date: endDate,
      category,
      status,
    })
    .select(EVENT_COLUMNS)
    .single();
  if (error) throwWriteError("academic calendar: buat", error);

  return res.status(201).json({
    success: true,
    message: "Agenda berhasil dibuat",
    data: { event: serializeEvent(data, toCategoryMap(categories)) },
  });
};

// ---------------------------------------------------------------------
// PATCH /api/admin/academic-calendar/:id
// ---------------------------------------------------------------------
const updateEvent = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const current = await findEventById(id, "academic calendar: ambil untuk update");
  if (!current) throw eventNotFound();

  const categories = await listCategories("academic calendar update");
  const categoryMap = toCategoryMap(categories);

  // Kategori hanya diperiksa bila DIUBAH, sehingga agenda lama berkategori nonaktif tetap bisa diedit.
  if (body.category !== undefined && body.category !== current.category) {
    assertCategoryUsable(body.category, categories);
  }

  // Urutan tanggal diperiksa terhadap nilai gabungan (kiriman + data lama), karena klien boleh
  // mengirim hanya salah satu tanggal.
  const finalStart = body.startDate ?? current.start_date;
  const finalEnd = body.endDate ?? current.end_date;
  if (finalEnd < finalStart) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", [
      { field: "endDate", message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai" },
    ]);
  }

  const patch = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.startDate !== undefined) patch.start_date = body.startDate;
  if (body.endDate !== undefined) patch.end_date = body.endDate;
  if (body.category !== undefined) patch.category = body.category;
  if (body.status !== undefined) patch.status = body.status;

  const changed = Object.keys(patch).filter((key) => patch[key] !== current[key]);
  if (changed.length === 0) {
    return res.json({
      success: true,
      message: "Tidak ada perubahan",
      data: { event: serializeEvent(current, categoryMap) },
    });
  }

  const { data, error } = await supabase
    .from("academic_calendar_events")
    .update(patch)
    .eq("id", id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) throwWriteError("academic calendar: perbarui", error);
  if (!data) throw eventNotFound();

  return res.json({
    success: true,
    message: "Agenda berhasil diperbarui",
    data: { event: serializeEvent(data, categoryMap) },
  });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/academic-calendar/:id
// ---------------------------------------------------------------------
const deleteEvent = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from("academic_calendar_events")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throwDbError("academic calendar: hapus", error);

  if (!data || data.length === 0) throw eventNotFound();

  return res.json({ success: true, message: "Agenda berhasil dihapus" });
};

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
