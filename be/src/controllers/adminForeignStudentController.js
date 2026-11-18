const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  REQUIREMENTS_TABLE,
  serializeForeignStudentSettings,
  serializeForeignStudentRequirement,
  itemNotFound,
} = require("../services/foreignStudentService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN HEADER & REFERENSI ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[FOREIGN STUDENTS ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeForeignStudentSettings(data),
    },
  });
};

const updateSettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.introEyebrow !== undefined) payload.intro_eyebrow = b.introEyebrow;
  if (b.introTitle !== undefined) payload.intro_title = b.introTitle;
  if (b.introDescription !== undefined) payload.intro_description = b.introDescription;
  if (b.requirementsEyebrow !== undefined) payload.requirements_eyebrow = b.requirementsEyebrow;
  if (b.requirementsTitle !== undefined) payload.requirements_title = b.requirementsTitle;
  if (b.requirementsDescription !== undefined) payload.requirements_description = b.requirementsDescription;
  if (b.referenceTitle !== undefined) payload.reference_title = b.referenceTitle;
  if (b.referenceDescription !== undefined) payload.reference_description = b.referenceDescription;
  if (b.referenceUrl !== undefined) payload.reference_url = b.referenceUrl;
  if (b.referenceLabel !== undefined) payload.reference_label = b.referenceLabel;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("mahasiswa asing: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("mahasiswa asing: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan mahasiswa asing berhasil diperbarui",
    data: {
      settings: serializeForeignStudentSettings(result),
    },
  });
};

// ==================== 2. CRUD DOKUMEN PERSYARATAN ====================

const listRequirements = async (req, res) => {
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

  const countQuery = applyFilters(
    supabase.from(REQUIREMENTS_TABLE).select("*", { count: "exact", head: true })
  );
  const { count, error: countErr } = await countQuery;
  if (countErr) throwDbError("mahasiswa asing: hitung total dokumen persyaratan", countErr);

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
      .from(REQUIREMENTS_TABLE)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to)
  );

  const { data, error } = await dataQuery;
  if (error && error.code !== RANGE_NOT_SATISFIABLE) {
    throwDbError("mahasiswa asing: ambil daftar dokumen persyaratan", error);
  }

  const items = (data || []).map((row) => serializeForeignStudentRequirement(row));

  return res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages },
    },
  });
};

const getRequirement = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase
    .from(REQUIREMENTS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError("mahasiswa asing: ambil detail dokumen", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    data: {
      requirement: serializeForeignStudentRequirement(data),
    },
  });
};

const createRequirement = async (req, res) => {
  const b = req.body;
  const payload = {
    title: b.title ?? null,
    description: b.description,
    sort_order: b.sortOrder ?? 0,
    status: b.status || "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(REQUIREMENTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throwWriteError("mahasiswa asing: tambah dokumen", error);

  return res.status(201).json({
    success: true,
    message: "Dokumen persyaratan berhasil ditambahkan",
    data: {
      requirement: serializeForeignStudentRequirement(data),
    },
  });
};

const updateRequirement = async (req, res) => {
  const { id } = req.validated.params;
  const b = req.body;

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.title !== undefined) payload.title = b.title;
  if (b.description !== undefined) payload.description = b.description;
  if (b.sortOrder !== undefined) payload.sort_order = b.sortOrder;
  if (b.status !== undefined) payload.status = b.status;

  const { data, error } = await supabase
    .from(REQUIREMENTS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throwWriteError("mahasiswa asing: perbarui dokumen", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    message: "Dokumen persyaratan berhasil diperbarui",
    data: {
      requirement: serializeForeignStudentRequirement(data),
    },
  });
};

const deleteRequirement = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase
    .from(REQUIREMENTS_TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throwDbError("mahasiswa asing: hapus dokumen", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    message: "Dokumen persyaratan berhasil dihapus",
    data: { id: data.id },
  });
};

module.exports = {
  getSettings,
  updateSettings,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
};

