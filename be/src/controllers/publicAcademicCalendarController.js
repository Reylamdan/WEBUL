const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");
const {
  EVENT_COLUMNS,
  listCategories,
  toCategoryMap,
  serializeCategory,
  serializeEvent,
  assertCategoryKnown,
  applyEventFilters,
  eventNotFound,
} = require("../services/academicCalendarService");

const RANGE_NOT_SATISFIABLE = "PGRST103";

// ---------------------------------------------------------------------
// GET /api/academic-calendar/categories
// Kategori aktif, untuk filter/legenda di frontend.
// ---------------------------------------------------------------------
const listPublicCategories = async (req, res) => {
  const categories = await listCategories("public academic calendar kategori");
  return res.json({
    success: true,
    data: { categories: categories.filter((c) => c.is_active).map(serializeCategory) },
  });
};

// ---------------------------------------------------------------------
// GET /api/academic-calendar
// Hanya status "published". Filter: category, from, to (irisan rentang), page, limit.
// ---------------------------------------------------------------------
const listPublicEvents = async (req, res) => {
  const { page, limit, category, from: fromDate, to: toDate } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const categories = await listCategories("public academic calendar");
  if (category) assertCategoryKnown(category, categories);

  const applyFilters = (query) =>
    applyEventFilters(query.eq("status", "published"), { category, from: fromDate, to: toDate });

  let { data, count, error } = await applyFilters(
    supabase.from("academic_calendar_events").select(EVENT_COLUMNS, { count: "exact" })
  )
    .order("start_date", { ascending: true })
    .order("end_date", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("academic_calendar_events").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("public academic calendar: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("public academic calendar: daftar", error);

  const total = count ?? 0;
  const categoryMap = toCategoryMap(categories);

  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeEvent(row, categoryMap, { includeStatus: false })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/academic-calendar/:id
// Draft dijawab 404 (sama seperti id yang tidak ada) agar keberadaannya tidak bocor.
// ---------------------------------------------------------------------
const getPublicEvent = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from("academic_calendar_events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throwDbError("public academic calendar: detail", error);
  if (!data) throw eventNotFound();

  const categoryMap = toCategoryMap(await listCategories("public academic calendar detail"));
  return res.json({
    success: true,
    data: { event: serializeEvent(data, categoryMap, { includeStatus: false }) },
  });
};

module.exports = { listPublicCategories, listPublicEvents, getPublicEvent };
