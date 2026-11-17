const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  PROGRAMS_TABLE,
  serializeCurriculumSettings,
  serializeCurriculumProgram,
  programNotFound,
} = require("../services/curriculumService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== PENGATURAN TEKS KURIKULUM & OBE ====================

// GET /api/admin/curriculum/settings
const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[CURRICULUM ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeCurriculumSettings(data),
    },
  });
};

// PUT /api/admin/curriculum/settings
const updateSettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroEyebrow !== undefined) payload.hero_eyebrow = b.heroEyebrow;
  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroDescription !== undefined) payload.hero_description = b.heroDescription;
  if (b.obeTitle !== undefined) payload.obe_title = b.obeTitle;
  if (b.obeLead !== undefined) payload.obe_lead = b.obeLead;
  if (b.obeDescription !== undefined) payload.obe_description = b.obeDescription;
  if (b.tableEyebrow !== undefined) payload.table_eyebrow = b.tableEyebrow;
  if (b.tableTitle !== undefined) payload.table_title = b.tableTitle;
  if (b.tableIntro !== undefined) payload.table_intro = b.tableIntro;
  if (b.tableNote !== undefined) payload.table_note = b.tableNote;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("kurikulum: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("kurikulum: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan teks kurikulum berhasil diperbarui",
    data: {
      settings: serializeCurriculumSettings(result),
    },
  });
};

// ==================== DAFTAR PROGRAM STUDI KURIKULUM (CRUD) ====================

// GET /api/admin/curriculum/programs
const listPrograms = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("name", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(PROGRAMS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(PROGRAMS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("kurikulum: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("kurikulum: daftar program", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeCurriculumProgram(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/admin/curriculum/programs/:id
const getProgram = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(PROGRAMS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("kurikulum: detail program", error);
  if (!data) throw programNotFound();

  return res.json({
    success: true,
    data: {
      program: serializeCurriculumProgram(data),
    },
  });
};

// POST /api/admin/curriculum/programs
const createProgram = async (req, res) => {
  const b = req.body;
  const { data, error } = await supabase
    .from(PROGRAMS_TABLE)
    .insert({
      name: b.name,
      href: b.href,
      focus: b.focus,
      components: b.components,
      sort_order: b.sortOrder ?? 0,
      status: b.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throwWriteError("kurikulum: buat program", error);

  return res.status(201).json({
    success: true,
    message: "Komponen kurikulum program studi berhasil ditambahkan",
    data: {
      program: serializeCurriculumProgram(data),
    },
  });
};

// PATCH /api/admin/curriculum/programs/:id
const updateProgram = async (req, res) => {
  const { id } = req.validated.params;
  const b = req.body;

  const payload = {
    updated_at: new Date().toISOString(),
  };
  if (b.name !== undefined) payload.name = b.name;
  if (b.href !== undefined) payload.href = b.href;
  if (b.focus !== undefined) payload.focus = b.focus;
  if (b.components !== undefined) payload.components = b.components;
  if (b.sortOrder !== undefined) payload.sort_order = b.sortOrder;
  if (b.status !== undefined) payload.status = b.status;

  const { data, error } = await supabase
    .from(PROGRAMS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throwWriteError("kurikulum: ubah program", error);
  if (!data) throw programNotFound();

  return res.json({
    success: true,
    message: "Komponen kurikulum program studi berhasil diperbarui",
    data: {
      program: serializeCurriculumProgram(data),
    },
  });
};

// DELETE /api/admin/curriculum/programs/:id
const deleteProgram = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(PROGRAMS_TABLE).delete().eq("id", id).select("id").maybeSingle();

  if (error) throwDbError("kurikulum: hapus program", error);
  if (!data) throw programNotFound();

  return res.json({
    success: true,
    message: "Komponen kurikulum program studi berhasil dihapus",
  });
};

module.exports = {
  getSettings,
  updateSettings,
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
};

