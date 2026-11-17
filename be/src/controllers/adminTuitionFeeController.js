const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  WAVES_TABLE,
  serializeTuitionSettings,
  serializeTuitionWave,
  waveNotFound,
} = require("../services/tuitionFeeService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== PENGATURAN HEADER & TEKS HALAMAN ====================

// GET /api/admin/tuition-fees/settings
const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[TUITION FEE ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeTuitionSettings(data),
    },
  });
};

// PUT /api/admin/tuition-fees/settings
const updateSettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroEyebrow !== undefined) payload.hero_eyebrow = b.heroEyebrow;
  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroDescription !== undefined) payload.hero_description = b.heroDescription;
  if (b.sectionEyebrow !== undefined) payload.section_eyebrow = b.sectionEyebrow;
  if (b.sectionTitle !== undefined) payload.section_title = b.sectionTitle;
  if (b.studyPrograms !== undefined) payload.study_programs = b.studyPrograms;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("biaya kuliah: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("biaya kuliah: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan biaya kuliah berhasil diperbarui",
    data: {
      settings: serializeTuitionSettings(result),
    },
  });
};

// ==================== DAFTAR GELOMBANG BIAYA KULIAH (CRUD) ====================

// GET /api/admin/tuition-fees/waves
const listWaves = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) {
      filtered = filtered.or(`name.ilike.%${term}%,period.ilike.%${term}%`);
    }
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(WAVES_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(WAVES_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("biaya kuliah: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("biaya kuliah: daftar gelombang", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeTuitionWave(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/admin/tuition-fees/waves/:id
const getWave = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(WAVES_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("biaya kuliah: ambil gelombang", error);
  if (!data) throw waveNotFound(id);

  return res.json({
    success: true,
    data: {
      wave: serializeTuitionWave(data),
    },
  });
};

// POST /api/admin/tuition-fees/waves
const createWave = async (req, res) => {
  const body = req.body;
  const payload = {
    name: body.name,
    period: body.period,
    fees: Array.isArray(body.fees) ? body.fees : [],
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(WAVES_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("biaya kuliah: buat gelombang", error);

  return res.status(201).json({
    success: true,
    message: "Gelombang biaya kuliah baru berhasil ditambahkan",
    data: {
      wave: serializeTuitionWave(data),
    },
  });
};

// PATCH /api/admin/tuition-fees/waves/:id
const updateWave = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(WAVES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("biaya kuliah: cek gelombang", existing.error);
  if (!existing.data) throw waveNotFound(id);

  const payload = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) payload.name = body.name;
  if (body.period !== undefined) payload.period = body.period;
  if (body.fees !== undefined) payload.fees = body.fees;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase
    .from(WAVES_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throwWriteError("biaya kuliah: perbarui gelombang", error);

  return res.json({
    success: true,
    message: "Gelombang biaya kuliah berhasil diperbarui",
    data: {
      wave: serializeTuitionWave(data),
    },
  });
};

// DELETE /api/admin/tuition-fees/waves/:id
const deleteWave = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(WAVES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("biaya kuliah: cek sebelum hapus", existing.error);
  if (!existing.data) throw waveNotFound(id);

  const { error } = await supabase.from(WAVES_TABLE).delete().eq("id", id);
  if (error) throwDbError("biaya kuliah: hapus gelombang", error);

  return res.json({
    success: true,
    message: "Gelombang biaya kuliah berhasil dihapus",
  });
};

module.exports = {
  getSettings,
  updateSettings,
  listWaves,
  getWave,
  createWave,
  updateWave,
  deleteWave,
};

