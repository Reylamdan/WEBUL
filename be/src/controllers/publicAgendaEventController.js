const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { AGENDA_CATEGORIES } = require("../utils/agendaCategories");
const {
  TABLE,
  EVENT_COLUMNS,
  serializeEvent,
  applyEventFilters,
  eventNotFound,
} = require("../services/agendaEventService");

const RANGE_NOT_SATISFIABLE = "PGRST103";

// GET /api/agenda-events/categories
// Daftar kategori untuk filter di frontend. "Semua Acara" ditambahkan oleh frontend.
const listPublicCategories = async (req, res) =>
  res.json({
    success: true,
    data: { categories: AGENDA_CATEGORIES.map(({ slug, name }) => ({ slug, name })) },
  });

// GET /api/agenda-events
// Hanya status "published". Filter: category, from, to (irisan rentang), search (judul), page, limit.
// Untuk "acara mendatang" frontend mengirim from=hari ini.
const listPublicEvents = async (req, res) => {
  const { page, limit, category, from: fromDate, to: toDate, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = applyEventFilters(query.eq("status", "published"), { category, from: fromDate, to: toDate });
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(supabase.from(TABLE).select(EVENT_COLUMNS, { count: "exact" }))
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("public agenda: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("public agenda: daftar", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeEvent(row, { includeStatus: false })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/agenda-events/:id
// Draft dijawab 404 (sama seperti id yang tidak ada) agar keberadaannya tidak bocor.
const getPublicEvent = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from(TABLE)
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throwDbError("public agenda: detail", error);
  if (!data) throw eventNotFound();

  return res.json({ success: true, data: { event: serializeEvent(data, { includeStatus: false }) } });
};

module.exports = { listPublicCategories, listPublicEvents, getPublicEvent };