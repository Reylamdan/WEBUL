const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  TERMS_TABLE,
  serializeResignationSettings,
  serializeResignationTerm,
  itemNotFound,
} = require("../services/resignationService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN HEADER ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[RESIGNATION ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeResignationSettings(data),
    },
  });
};

const updateSettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroEyebrow !== undefined) payload.hero_eyebrow = b.heroEyebrow;
  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroDescription !== undefined) payload.hero_description = b.heroDescription;
  if (b.sectionTitle !== undefined) payload.section_title = b.sectionTitle;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("pengunduran diri: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("pengunduran diri: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan pengunduran diri berhasil diperbarui",
    data: {
      settings: serializeResignationSettings(result),
    },
  });
};

// ==================== 2. CRUD SYARAT & KETENTUAN ====================

const listTerms = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(TERMS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TERMS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("pengunduran diri: hitung total syarat", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("pengunduran diri: daftar syarat", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeResignationTerm(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

const getTerm = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(TERMS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("pengunduran diri: ambil syarat", error);
  if (!data) throw itemNotFound(id);

  return res.json({ success: true, data: { term: serializeResignationTerm(data) } });
};

const createTerm = async (req, res) => {
  const body = req.body;
  const payload = {
    title: body.title !== undefined ? body.title : null,
    description: body.description,
    refund_percentage: body.refundPercentage !== undefined ? body.refundPercentage : null,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(TERMS_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("pengunduran diri: buat syarat", error);

  return res.status(201).json({
    success: true,
    message: "Syarat & ketentuan berhasil ditambahkan",
    data: { term: serializeResignationTerm(data) },
  });
};

const updateTerm = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(TERMS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("pengunduran diri: cek syarat", existing.error);
  if (!existing.data) throw itemNotFound(id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) payload.title = body.title;
  if (body.description !== undefined) payload.description = body.description;
  if (body.refundPercentage !== undefined) payload.refund_percentage = body.refundPercentage;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(TERMS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("pengunduran diri: perbarui syarat", error);

  return res.json({
    success: true,
    message: "Syarat & ketentuan berhasil diperbarui",
    data: { term: serializeResignationTerm(data) },
  });
};

const deleteTerm = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(TERMS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("pengunduran diri: cek syarat sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound(id);

  const { error } = await supabase.from(TERMS_TABLE).delete().eq("id", id);
  if (error) throwDbError("pengunduran diri: hapus syarat", error);

  return res.json({ success: true, message: "Syarat & ketentuan berhasil dihapus" });
};

module.exports = {
  getSettings,
  updateSettings,
  listTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
};

