const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const { CATEGORY_LABELS } = require("../validators/ukmValidator");
const {
  SETTINGS_TABLE,
  ITEMS_TABLE,
  DEFAULT_UKM_CATEGORIES,
  serializeUkmSettings,
  serializeUkmItem,
  itemNotFound,
} = require("../services/ukmService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN HEADER & CTA ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[UKM ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeUkmSettings(data),
      categories: DEFAULT_UKM_CATEGORIES,
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
  if (b.heroSubtitle !== undefined) payload.hero_subtitle = b.heroSubtitle;
  if (b.heroBadge !== undefined) payload.hero_badge = b.heroBadge;
  if (b.introEyebrow !== undefined) payload.intro_eyebrow = b.introEyebrow;
  if (b.introTitle !== undefined) payload.intro_title = b.introTitle;
  if (b.introDescription !== undefined) payload.intro_description = b.introDescription;
  if (b.categoryTitle !== undefined) payload.category_title = b.categoryTitle;
  if (b.categoryDesc !== undefined) payload.category_desc = b.categoryDesc;
  if (b.cardsTitle !== undefined) payload.cards_title = b.cardsTitle;
  if (b.cardsDesc !== undefined) payload.cards_desc = b.cardsDesc;
  if (b.ctaTitle !== undefined) payload.cta_title = b.ctaTitle;
  if (b.ctaDescription !== undefined) payload.cta_description = b.ctaDescription;
  if (b.ctaButtonLabel !== undefined) payload.cta_button_label = b.ctaButtonLabel;
  if (b.modalTitle !== undefined) payload.modal_title = b.modalTitle;
  if (b.modalSubtitle !== undefined) payload.modal_subtitle = b.modalSubtitle;
  if (b.modalScheduleText !== undefined) payload.modal_schedule_text = b.modalScheduleText;
  if (b.modalRequirementsText !== undefined) payload.modal_requirements_text = b.modalRequirementsText;
  if (b.modalContactEmail !== undefined) payload.modal_contact_email = b.modalContactEmail;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("kegiatan mahasiswa (UKM): buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("kegiatan mahasiswa (UKM): perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan UKM / Kegiatan Mahasiswa berhasil diperbarui",
    data: {
      settings: serializeUkmSettings(result),
    },
  });
};

// ==================== 2. CRUD KEGIATAN MAHASISWA (UKM) ====================

const listItems = async (req, res) => {
  const { page, limit, status, category, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (category) filtered = filtered.eq("category", category);
    if (term) filtered = filtered.or(`title.ilike.%${term}%,description.ilike.%${term}%,meta.ilike.%${term}%`);
    return filtered;
  };

  const countQuery = applyFilters(
    supabase.from(ITEMS_TABLE).select("*", { count: "exact", head: true })
  );
  const { count, error: countErr } = await countQuery;
  if (countErr) throwDbError("kegiatan mahasiswa (UKM): hitung total data", countErr);

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
      .from(ITEMS_TABLE)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to)
  );

  const { data, error } = await dataQuery;
  if (error && error.code !== RANGE_NOT_SATISFIABLE) {
    throwDbError("kegiatan mahasiswa (UKM): ambil daftar data", error);
  }

  const items = (data || []).map((row) => serializeUkmItem(row));

  return res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages },
    },
  });
};

const getItem = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError("kegiatan mahasiswa (UKM): ambil detail data", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    data: {
      item: serializeUkmItem(data),
    },
  });
};

const createItem = async (req, res) => {
  const b = req.body;
  const categoryLabel = b.categoryLabel || CATEGORY_LABELS[b.category] || b.category;

  const payload = {
    title: b.title,
    category: b.category,
    category_label: categoryLabel,
    description: b.description,
    meta: b.meta ?? null,
    image_url: b.imageUrl ?? null,
    sort_order: b.sortOrder ?? 0,
    status: b.status || "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throwWriteError("kegiatan mahasiswa (UKM): tambah data", error);

  return res.status(201).json({
    success: true,
    message: "Kegiatan mahasiswa (UKM) berhasil ditambahkan",
    data: {
      item: serializeUkmItem(data),
    },
  });
};

const updateItem = async (req, res) => {
  const { id } = req.validated.params;
  const b = req.body;

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (b.title !== undefined) payload.title = b.title;
  if (b.category !== undefined) {
    payload.category = b.category;
    payload.category_label = b.categoryLabel || CATEGORY_LABELS[b.category] || b.category;
  } else if (b.categoryLabel !== undefined) {
    payload.category_label = b.categoryLabel;
  }
  if (b.description !== undefined) payload.description = b.description;
  if (b.meta !== undefined) payload.meta = b.meta;
  if (b.imageUrl !== undefined) payload.image_url = b.imageUrl;
  if (b.sortOrder !== undefined) payload.sort_order = b.sortOrder;
  if (b.status !== undefined) payload.status = b.status;

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throwWriteError("kegiatan mahasiswa (UKM): perbarui data", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    message: "Kegiatan mahasiswa (UKM) berhasil diperbarui",
    data: {
      item: serializeUkmItem(data),
    },
  });
};

const deleteItem = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throwDbError("kegiatan mahasiswa (UKM): hapus data", error);
  if (!data) throw itemNotFound(id);

  return res.json({
    success: true,
    message: "Kegiatan mahasiswa (UKM) berhasil dihapus",
    data: { id: data.id },
  });
};

module.exports = {
  getSettings,
  updateSettings,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
};

