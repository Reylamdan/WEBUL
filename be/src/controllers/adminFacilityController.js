const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { validateAndReencode } = require("../utils/imageValidator");
const {
  buildFacilityImagePath,
  buildProfileImagePath,
  uploadCoverObject,
  removeCoverObjectQuietly,
} = require("../utils/coverStorage");
const {
  SETTINGS_TABLE,
  FACILITIES_TABLE,
  serializeFacilitySettings,
  serializeFacility,
  facilityNotFound,
} = require("../services/facilityService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== PENGATURAN HEADER FASILITAS ====================

// GET /api/admin/facilities/settings
const getFacilitySettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[FACILITY ADMIN] DB error getFacilitySettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeFacilitySettings(data),
    },
  });
};

// PUT /api/admin/facilities/settings
const updateFacilitySettings = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroSubtitle !== undefined) payload.hero_subtitle = b.heroSubtitle;
  if (b.galleryEyebrow !== undefined) payload.gallery_eyebrow = b.galleryEyebrow;
  if (b.galleryTitle !== undefined) payload.gallery_title = b.galleryTitle;
  if (b.galleryDescription !== undefined) payload.gallery_description = b.galleryDescription;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("fasilitas: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("fasilitas: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan header fasilitas kampus berhasil diperbarui",
    data: {
      settings: serializeFacilitySettings(result),
    },
  });
};

// PUT /api/admin/facilities/settings/hero-image
const putHeroImage = async (req, res) => {
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const { data: current } = await supabase.from(SETTINGS_TABLE).select("hero_image_path").eq("id", "main").maybeSingle();
  const oldPath = current?.hero_image_path ?? null;

  const processed = await validateAndReencode(req.file);
  const newPath = buildProfileImagePath("facility-hero", processed.extension);

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  const { data: updated, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "main", hero_image_path: newPath, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putFacilityHeroImage: kompensasi");
    throwDbError("fasilitas: perbarui hero_image_path", error);
  }

  if (oldPath) await removeCoverObjectQuietly(oldPath, "putFacilityHeroImage: hapus lama");

  return res.json({
    success: true,
    message: "Gambar hero fasilitas kampus berhasil diperbarui",
    data: {
      settings: serializeFacilitySettings(updated),
    },
  });
};

// DELETE /api/admin/facilities/settings/hero-image
const deleteHeroImage = async (req, res) => {
  const { data: current } = await supabase.from(SETTINGS_TABLE).select("hero_image_path").eq("id", "main").maybeSingle();
  const oldPath = current?.hero_image_path ?? null;

  if (!oldPath) throw new AppError("Gambar hero tidak ditemukan", 404, "IMAGE_NOT_FOUND");

  const { data: updated, error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ hero_image_path: null, updated_at: new Date().toISOString() })
    .eq("id", "main")
    .select("*")
    .single();

  if (error) throwDbError("fasilitas: hapus hero_image_path", error);
  await removeCoverObjectQuietly(oldPath, "deleteFacilityHeroImage: hapus");

  return res.json({
    success: true,
    message: "Gambar hero fasilitas kampus berhasil dihapus",
    data: {
      settings: serializeFacilitySettings(updated),
    },
  });
};

// ==================== DAFTAR FASILITAS KAMPUS (CRUD) ====================

// GET /api/admin/facilities
const listFacilities = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(FACILITIES_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(FACILITIES_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("fasilitas: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("fasilitas: daftar", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeFacility(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/admin/facilities/:id
const getFacility = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(FACILITIES_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("fasilitas: detail", error);
  if (!data) throw facilityNotFound();

  return res.json({
    success: true,
    data: {
      facility: serializeFacility(data),
    },
  });
};

// POST /api/admin/facilities
const createFacility = async (req, res) => {
  const b = req.body;
  const { data, error } = await supabase
    .from(FACILITIES_TABLE)
    .insert({
      title: b.title,
      description: b.description,
      sort_order: b.sortOrder ?? 0,
      status: b.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throwWriteError("fasilitas: buat", error);

  return res.status(201).json({
    success: true,
    message: "Fasilitas kampus berhasil ditambahkan",
    data: {
      facility: serializeFacility(data),
    },
  });
};

// PATCH /api/admin/facilities/:id
const updateFacility = async (req, res) => {
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
    .from(FACILITIES_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throwWriteError("fasilitas: ubah", error);
  if (!data) throw facilityNotFound();

  return res.json({
    success: true,
    message: "Fasilitas kampus berhasil diperbarui",
    data: {
      facility: serializeFacility(data),
    },
  });
};

// DELETE /api/admin/facilities/:id
const deleteFacility = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(FACILITIES_TABLE).delete().eq("id", id).select("id, image_path").maybeSingle();

  if (error) throwDbError("fasilitas: hapus", error);
  if (!data) throw facilityNotFound();

  if (data.image_path) {
    await removeCoverObjectQuietly(data.image_path, "deleteFacility: hapus gambar");
  }

  return res.json({
    success: true,
    message: "Fasilitas kampus berhasil dihapus",
  });
};

// PUT /api/admin/facilities/:id/image
const putFacilityImage = async (req, res) => {
  const { id } = req.validated.params;
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const { data: facility, error: getErr } = await supabase.from(FACILITIES_TABLE).select("id, image_path").eq("id", id).maybeSingle();
  if (getErr) throwDbError("fasilitas: cari untuk gambar", getErr);
  if (!facility) throw facilityNotFound();

  const oldPath = facility.image_path;
  const processed = await validateAndReencode(req.file);
  const newPath = buildFacilityImagePath(facility.id, processed.extension);

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  const { data: updated, error } = await supabase
    .from(FACILITIES_TABLE)
    .update({ image_path: newPath, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putFacilityImage: kompensasi");
    throwDbError("fasilitas: perbarui image_path", error);
  }

  if (oldPath) await removeCoverObjectQuietly(oldPath, "putFacilityImage: hapus lama");

  return res.json({
    success: true,
    message: "Foto fasilitas kampus berhasil diperbarui",
    data: {
      facility: serializeFacility(updated),
    },
  });
};

// DELETE /api/admin/facilities/:id/image
const deleteFacilityImage = async (req, res) => {
  const { id } = req.validated.params;
  const { data: facility, error: getErr } = await supabase.from(FACILITIES_TABLE).select("id, image_path").eq("id", id).maybeSingle();
  if (getErr) throwDbError("fasilitas: cari untuk hapus gambar", getErr);
  if (!facility) throw facilityNotFound();

  const oldPath = facility.image_path;
  if (!oldPath) throw new AppError("Foto fasilitas tidak ditemukan", 404, "IMAGE_NOT_FOUND");

  const { data: updated, error } = await supabase
    .from(FACILITIES_TABLE)
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throwDbError("fasilitas: hapus image_path", error);
  await removeCoverObjectQuietly(oldPath, "deleteFacilityImage: hapus");

  return res.json({
    success: true,
    message: "Foto fasilitas berhasil dihapus",
    data: {
      facility: serializeFacility(updated),
    },
  });
};

module.exports = {
  getFacilitySettings,
  updateFacilitySettings,
  putHeroImage,
  deleteHeroImage,
  listFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  putFacilityImage,
  deleteFacilityImage,
};

