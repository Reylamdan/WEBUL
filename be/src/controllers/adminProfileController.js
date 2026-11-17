const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { validateAndReencode } = require("../utils/imageValidator");
const {
  buildProfileImagePath,
  uploadCoverObject,
  removeCoverObjectQuietly,
} = require("../utils/coverStorage");
const {
  SETTINGS_TABLE,
  CARDS_TABLE,
  DEFAULT_PROFILE_CONTENT,
  serializeProfileContent,
  serializeProfileCard,
  cardNotFound,
} = require("../services/profileService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== KONTEN HALAMAN PROFIL ====================

// GET /api/admin/profile/content
const getProfileContent = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // Abaikan jika tabel kosong/belum ada baris
    console.error("[PROFILE ADMIN] DB error getProfileContent:", error.message);
  }

  return res.json({
    success: true,
    data: {
      content: serializeProfileContent(data),
    },
  });
};

// PUT /api/admin/profile/content
const updateProfileContent = async (req, res) => {
  const b = req.body;
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.heroTitle !== undefined) payload.hero_title = b.heroTitle;
  if (b.heroSubtitle !== undefined) payload.hero_subtitle = b.heroSubtitle;
  if (b.aboutEyebrow !== undefined) payload.about_eyebrow = b.aboutEyebrow;
  if (b.aboutTitle !== undefined) payload.about_title = b.aboutTitle;
  if (b.aboutLead !== undefined) payload.about_lead = b.aboutLead;
  if (b.aboutBody !== undefined) payload.about_body = b.aboutBody;
  if (b.exploreEyebrow !== undefined) payload.explore_eyebrow = b.exploreEyebrow;
  if (b.exploreTitle !== undefined) payload.explore_title = b.exploreTitle;
  if (b.exploreDescription !== undefined) payload.explore_description = b.exploreDescription;
  if (b.bottomNote !== undefined) payload.bottom_note = b.bottomNote;

  // Cek apakah row sudah ada
  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    // Insert baru
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("profil: buat pengaturan", error);
    result = data;
  } else {
    // Update row yang ada
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("profil: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Konten halaman profil berhasil diperbarui",
    data: {
      content: serializeProfileContent(result),
    },
  });
};

// PUT /api/admin/profile/content/hero-image
const putHeroImage = async (req, res) => {
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const { data: current } = await supabase.from(SETTINGS_TABLE).select("hero_image_path").eq("id", "main").maybeSingle();
  const oldPath = current?.hero_image_path ?? null;

  const processed = await validateAndReencode(req.file);
  const newPath = buildProfileImagePath("hero", processed.extension);

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  const { data: updated, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "main", hero_image_path: newPath, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putHeroImage: kompensasi");
    throwDbError("profil: perbarui hero_image_path", error);
  }

  if (oldPath) await removeCoverObjectQuietly(oldPath, "putHeroImage: hapus lama");

  return res.json({
    success: true,
    message: "Gambar hero profil berhasil diperbarui",
    data: {
      content: serializeProfileContent(updated),
    },
  });
};

// DELETE /api/admin/profile/content/hero-image
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

  if (error) throwDbError("profil: hapus hero_image_path", error);
  await removeCoverObjectQuietly(oldPath, "deleteHeroImage: hapus");

  return res.json({
    success: true,
    message: "Gambar hero berhasil dihapus",
    data: {
      content: serializeProfileContent(updated),
    },
  });
};

// PUT /api/admin/profile/content/about-image
const putAboutImage = async (req, res) => {
  if (!req.file) throw new AppError("File gambar wajib diisi", 400, "FILE_REQUIRED");

  const { data: current } = await supabase.from(SETTINGS_TABLE).select("about_image_path").eq("id", "main").maybeSingle();
  const oldPath = current?.about_image_path ?? null;

  const processed = await validateAndReencode(req.file);
  const newPath = buildProfileImagePath("about", processed.extension);

  await uploadCoverObject(newPath, processed.buffer, processed.mimeType);

  const { data: updated, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "main", about_image_path: newPath, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    await removeCoverObjectQuietly(newPath, "putAboutImage: kompensasi");
    throwDbError("profil: perbarui about_image_path", error);
  }

  if (oldPath) await removeCoverObjectQuietly(oldPath, "putAboutImage: hapus lama");

  return res.json({
    success: true,
    message: "Gambar tentang kami berhasil diperbarui",
    data: {
      content: serializeProfileContent(updated),
    },
  });
};

// DELETE /api/admin/profile/content/about-image
const deleteAboutImage = async (req, res) => {
  const { data: current } = await supabase.from(SETTINGS_TABLE).select("about_image_path").eq("id", "main").maybeSingle();
  const oldPath = current?.about_image_path ?? null;

  if (!oldPath) throw new AppError("Gambar tentang kami tidak ditemukan", 404, "IMAGE_NOT_FOUND");

  const { data: updated, error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ about_image_path: null, updated_at: new Date().toISOString() })
    .eq("id", "main")
    .select("*")
    .single();

  if (error) throwDbError("profil: hapus about_image_path", error);
  await removeCoverObjectQuietly(oldPath, "deleteAboutImage: hapus");

  return res.json({
    success: true,
    message: "Gambar tentang kami berhasil dihapus",
    data: {
      content: serializeProfileContent(updated),
    },
  });
};

// ==================== KARTU JELAJAHI PROFIL (CRUD) ====================

// GET /api/admin/profile/cards
const listCards = async (req, res) => {
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
    supabase.from(CARDS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(CARDS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("kartu profil: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("kartu profil: daftar", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeProfileCard(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// GET /api/admin/profile/cards/:id
const getCard = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(CARDS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("kartu profil: detail", error);
  if (!data) throw cardNotFound();

  return res.json({
    success: true,
    data: {
      card: serializeProfileCard(data),
    },
  });
};

// POST /api/admin/profile/cards
const createCard = async (req, res) => {
  const b = req.body;
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .insert({
      title: b.title,
      description: b.description,
      href: b.href,
      sort_order: b.sortOrder ?? 0,
      status: b.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throwWriteError("kartu profil: buat", error);

  return res.status(201).json({
    success: true,
    message: "Kartu profil berhasil ditambahkan",
    data: {
      card: serializeProfileCard(data),
    },
  });
};

// PATCH /api/admin/profile/cards/:id
const updateCard = async (req, res) => {
  const { id } = req.validated.params;
  const b = req.body;

  const payload = {
    updated_at: new Date().toISOString(),
  };
  if (b.title !== undefined) payload.title = b.title;
  if (b.description !== undefined) payload.description = b.description;
  if (b.href !== undefined) payload.href = b.href;
  if (b.sortOrder !== undefined) payload.sort_order = b.sortOrder;
  if (b.status !== undefined) payload.status = b.status;

  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throwWriteError("kartu profil: ubah", error);
  if (!data) throw cardNotFound();

  return res.json({
    success: true,
    message: "Kartu profil berhasil diperbarui",
    data: {
      card: serializeProfileCard(data),
    },
  });
};

// DELETE /api/admin/profile/cards/:id
const deleteCard = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(CARDS_TABLE).delete().eq("id", id).select("id").maybeSingle();

  if (error) throwDbError("kartu profil: hapus", error);
  if (!data) throw cardNotFound();

  return res.json({
    success: true,
    message: "Kartu profil berhasil dihapus",
  });
};

module.exports = {
  getProfileContent,
  updateProfileContent,
  putHeroImage,
  deleteHeroImage,
  putAboutImage,
  deleteAboutImage,
  listCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
};

