const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  REPORTS_TABLE,
  DEFAULT_RECTOR_REPORTS,
  serializeRectorReportSettings,
  serializeRectorReport,
  reportNotFound,
} = require("../services/rectorReportService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN HEADER & HALAMAN ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[RECTOR REPORTS ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeRectorReportSettings(data),
    },
  });
};

const updateSettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroDescription !== undefined) payload.hero_description = b.heroDescription;
  if (b.archiveTitle !== undefined) payload.archive_title = b.archiveTitle;
  if (b.contactEmail !== undefined) payload.contact_email = b.contactEmail;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("laporan tahunan rektor: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("laporan tahunan rektor: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan Laporan Tahunan Rektor berhasil diperbarui",
    data: {
      settings: serializeRectorReportSettings(result),
    },
  });
};

// ==================== 2. CRUD LAPORAN TAHUNAN REKTOR ====================

const listReports = async (req, res) => {
  const { page, limit, status, year, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (year) filtered = filtered.eq("year", year);
    if (term) filtered = filtered.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    return filtered;
  };

  const countQuery = applyFilters(
    supabase.from(REPORTS_TABLE).select("*", { count: "exact", head: true })
  );
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    // Jika tabel belum ada, fallback ke default agar admin tetap responsive
    console.warn("[RECTOR REPORTS ADMIN] count query error, falling back:", countErr.message);
    const filteredDefaults = DEFAULT_RECTOR_REPORTS.filter((item) => {
      if (status && item.status !== status) return false;
      if (year && item.year !== year) return false;
      if (term && !item.title.toLowerCase().includes(term.toLowerCase()) && !item.description.toLowerCase().includes(term.toLowerCase())) {
        return false;
      }
      return true;
    });
    return res.json({
      success: true,
      data: {
        items: filteredDefaults,
        pagination: { page, limit, total: filteredDefaults.length, totalPages: 1 },
      },
    });
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (total === 0 || from >= total) {
    return res.json({
      success: true,
      data: {
        items: [],
        pagination: { page, limit, total, totalPages },
      },
    });
  }

  const dataQuery = applyFilters(
    supabase
      .from(REPORTS_TABLE)
      .select("*")
      .order("year", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  const { data, error } = await dataQuery;
  if (error && error.code !== RANGE_NOT_SATISFIABLE) {
    throwDbError("laporan tahunan rektor: ambil daftar data", error);
  }

  const items = (data || []).map((row) => serializeRectorReport(row));

  return res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages },
    },
  });
};

const getReport = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError("laporan tahunan rektor: ambil detail data", error);
  if (!data) throw reportNotFound(id);

  return res.json({
    success: true,
    data: {
      report: serializeRectorReport(data),
    },
  });
};

const createReport = async (req, res) => {
  const b = req.body;

  const payload = {
    year: b.year,
    title: b.title,
    description: b.description || "",
    cover_url: b.coverUrl ?? null,
    file_url: b.fileUrl ?? null,
    contact_email: b.contactEmail ?? null,
    sort_order: b.sortOrder ?? 0,
    status: b.status || "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throwWriteError("laporan tahunan rektor: buat data", error);

  return res.status(201).json({
    success: true,
    message: "Laporan tahunan rektor berhasil ditambahkan",
    data: {
      report: serializeRectorReport(data),
    },
  });
};

const updateReport = async (req, res) => {
  const { id } = req.validated.params;
  const b = req.body;

  const existing = await supabase
    .from(REPORTS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) throwDbError("laporan tahunan rektor: cek keberadaan", existing.error);
  if (!existing.data) throw reportNotFound(id);

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.year !== undefined) payload.year = b.year;
  if (b.title !== undefined) payload.title = b.title;
  if (b.description !== undefined) payload.description = b.description;
  if (b.coverUrl !== undefined) payload.cover_url = b.coverUrl;
  if (b.fileUrl !== undefined) payload.file_url = b.fileUrl;
  if (b.contactEmail !== undefined) payload.contact_email = b.contactEmail;
  if (b.sortOrder !== undefined) payload.sort_order = b.sortOrder;
  if (b.status !== undefined) payload.status = b.status;

  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throwWriteError("laporan tahunan rektor: perbarui data", error);

  return res.json({
    success: true,
    message: "Laporan tahunan rektor berhasil diperbarui",
    data: {
      report: serializeRectorReport(data),
    },
  });
};

const deleteReport = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase
    .from(REPORTS_TABLE)
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) throwDbError("laporan tahunan rektor: cek keberadaan untuk hapus", existing.error);
  if (!existing.data) throw reportNotFound(id);

  const { error } = await supabase.from(REPORTS_TABLE).delete().eq("id", id);
  if (error) throwDbError("laporan tahunan rektor: hapus data", error);

  return res.json({
    success: true,
    message: `Laporan tahunan rektor "${existing.data.title}" berhasil dihapus`,
  });
};

module.exports = {
  getSettings,
  updateSettings,
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
};

