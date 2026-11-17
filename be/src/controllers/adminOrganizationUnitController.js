const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { removeCoverObjectQuietly } = require("../utils/coverStorage");
const { ORGANIZATION_CATEGORIES } = require("../utils/organizationCategories");
const { TABLE, UNIT_COLUMNS, serializeUnit, unitNotFound } = require("../services/organizationUnitService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const findUnitById = async (id, context) => {
  const { data, error } = await supabase.from(TABLE).select(UNIT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// GET /api/admin/organization-units/categories
const listCategories = async (req, res) =>
  res.json({
    success: true,
    data: { categories: ORGANIZATION_CATEGORIES.map(({ slug, name, description }) => ({ slug, name, description })) },
  });

// GET /api/admin/organization-units
const listUnits = async (req, res) => {
  const { page, limit, status, category, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (category) filtered = filtered.eq("category", category);
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(supabase.from(TABLE).select(UNIT_COLUMNS, { count: "exact" }))
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("organisasi: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("organisasi: daftar", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeUnit(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/admin/organization-units/:id
const getUnit = async (req, res) => {
  const row = await findUnitById(req.validated.params.id, "organisasi: detail");
  if (!row) throw unitNotFound();
  return res.json({ success: true, data: { unit: serializeUnit(row) } });
};

// POST /api/admin/organization-units
const createUnit = async (req, res) => {
  const b = req.body;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: b.title,
      position: b.position ?? null,
      description: b.description ?? null,
      category: b.category,
      sort_order: b.sortOrder ?? 0,
      status: b.status ?? "draft",
    })
    .select(UNIT_COLUMNS)
    .single();
  if (error) throwWriteError("organisasi: buat", error);

  return res.status(201).json({ success: true, message: "Data berhasil dibuat", data: { unit: serializeUnit(data) } });
};

// PATCH /api/admin/organization-units/:id
const updateUnit = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const current = await findUnitById(id, "organisasi: ambil untuk update");
  if (!current) throw unitNotFound();

  const patch = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.position !== undefined) patch.position = body.position;
  if (body.description !== undefined) patch.description = body.description;
  if (body.category !== undefined) patch.category = body.category;
  if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
  if (body.status !== undefined) patch.status = body.status;

  const changed = Object.keys(patch).filter((key) => (patch[key] ?? null) !== (current[key] ?? null));
  if (changed.length === 0) {
    return res.json({ success: true, message: "Tidak ada perubahan", data: { unit: serializeUnit(current) } });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select(UNIT_COLUMNS).maybeSingle();
  if (error) throwWriteError("organisasi: perbarui", error);
  if (!data) throw unitNotFound();

  return res.json({ success: true, message: "Data berhasil diperbarui", data: { unit: serializeUnit(data) } });
};

// DELETE /api/admin/organization-units/:id
const deleteUnit = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id, image_path");
  if (error) throwDbError("organisasi: hapus", error);
  if (!data || data.length === 0) throw unitNotFound();

  // Row sudah terhapus; file gambar dibersihkan setelahnya (kegagalan hanya dicatat).
  await removeCoverObjectQuietly(data[0].image_path, "deleteUnit: hapus file gambar organisasi");

  return res.json({ success: true, message: "Data berhasil dihapus" });
};

module.exports = { listCategories, listUnits, getUnit, createUnit, updateUnit, deleteUnit };
