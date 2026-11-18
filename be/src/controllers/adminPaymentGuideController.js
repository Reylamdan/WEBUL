const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  VA_STEPS_TABLE,
  CHANNELS_TABLE,
  serializePaymentSettings,
  serializeVaStep,
  serializeChannel,
  itemNotFound,
} = require("../services/paymentGuideService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN TEKS & GAMBAR PANDUAN ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[PAYMENT ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializePaymentSettings(data),
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
  if (b.vaSectionEyebrow !== undefined) payload.va_section_eyebrow = b.vaSectionEyebrow;
  if (b.vaSectionTitle !== undefined) payload.va_section_title = b.vaSectionTitle;
  if (b.vaSectionDescription !== undefined) payload.va_section_description = b.vaSectionDescription;
  if (b.vaImage1Url !== undefined) payload.va_image_1_url = b.vaImage1Url;
  if (b.vaImage1Alt !== undefined) payload.va_image_1_alt = b.vaImage1Alt;
  if (b.vaImage1Caption !== undefined) payload.va_image_1_caption = b.vaImage1Caption;
  if (b.vaImage2Url !== undefined) payload.va_image_2_url = b.vaImage2Url;
  if (b.vaImage2Alt !== undefined) payload.va_image_2_alt = b.vaImage2Alt;
  if (b.vaImage2Caption !== undefined) payload.va_image_2_caption = b.vaImage2Caption;
  if (b.methodsSectionEyebrow !== undefined) payload.methods_section_eyebrow = b.methodsSectionEyebrow;
  if (b.methodsSectionTitle !== undefined) payload.methods_section_title = b.methodsSectionTitle;
  if (b.methodsSectionDescription !== undefined) payload.methods_section_description = b.methodsSectionDescription;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("cara pembayaran: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("cara pembayaran: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan cara pembayaran berhasil diperbarui",
    data: {
      settings: serializePaymentSettings(result),
    },
  });
};

// ==================== 2. CRUD LANGKAH SIAKAD (VA STEPS) ====================

const listVaSteps = async (req, res) => {
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
    supabase.from(VA_STEPS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(VA_STEPS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("cara pembayaran: hitung total langkah", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("cara pembayaran: daftar langkah SiAkad", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeVaStep(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

const getVaStep = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(VA_STEPS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("cara pembayaran: ambil langkah", error);
  if (!data) throw itemNotFound("Langkah SiAkad", id);

  return res.json({ success: true, data: { step: serializeVaStep(data) } });
};

const createVaStep = async (req, res) => {
  const body = req.body;
  const payload = {
    title: body.title,
    description: body.description,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(VA_STEPS_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("cara pembayaran: buat langkah", error);

  return res.status(201).json({
    success: true,
    message: "Langkah SiAkad berhasil ditambahkan",
    data: { step: serializeVaStep(data) },
  });
};

const updateVaStep = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(VA_STEPS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("cara pembayaran: cek langkah", existing.error);
  if (!existing.data) throw itemNotFound("Langkah SiAkad", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) payload.title = body.title;
  if (body.description !== undefined) payload.description = body.description;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(VA_STEPS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("cara pembayaran: perbarui langkah", error);

  return res.json({
    success: true,
    message: "Langkah SiAkad berhasil diperbarui",
    data: { step: serializeVaStep(data) },
  });
};

const deleteVaStep = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(VA_STEPS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("cara pembayaran: cek langkah sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound("Langkah SiAkad", id);

  const { error } = await supabase.from(VA_STEPS_TABLE).delete().eq("id", id);
  if (error) throwDbError("cara pembayaran: hapus langkah", error);

  return res.json({ success: true, message: "Langkah SiAkad berhasil dihapus" });
};

// ==================== 3. CRUD KANAL PEMBAYARAN (CHANNELS) ====================

const listChannels = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.or(`name.ilike.%${term}%,channel_id.ilike.%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(CHANNELS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(CHANNELS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("cara pembayaran: hitung total kanal", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("cara pembayaran: daftar kanal", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeChannel(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

const getChannel = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(CHANNELS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("cara pembayaran: ambil kanal", error);
  if (!data) throw itemNotFound("Kanal pembayaran", id);

  return res.json({ success: true, data: { channel: serializeChannel(data) } });
};

const createChannel = async (req, res) => {
  const body = req.body;
  const payload = {
    channel_id: body.channelId,
    name: body.name,
    steps: Array.isArray(body.steps) ? body.steps : [],
    note: body.note !== undefined ? body.note : null,
    technical_note_title: body.technicalNoteTitle !== undefined ? body.technicalNoteTitle : null,
    technical_note: body.technicalNote !== undefined ? body.technicalNote : null,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(CHANNELS_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("cara pembayaran: buat kanal", error);

  return res.status(201).json({
    success: true,
    message: "Kanal pembayaran berhasil ditambahkan",
    data: { channel: serializeChannel(data) },
  });
};

const updateChannel = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(CHANNELS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("cara pembayaran: cek kanal", existing.error);
  if (!existing.data) throw itemNotFound("Kanal pembayaran", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.channelId !== undefined) payload.channel_id = body.channelId;
  if (body.name !== undefined) payload.name = body.name;
  if (body.steps !== undefined) payload.steps = body.steps;
  if (body.note !== undefined) payload.note = body.note;
  if (body.technicalNoteTitle !== undefined) payload.technical_note_title = body.technicalNoteTitle;
  if (body.technicalNote !== undefined) payload.technical_note = body.technicalNote;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(CHANNELS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("cara pembayaran: perbarui kanal", error);

  return res.json({
    success: true,
    message: "Kanal pembayaran berhasil diperbarui",
    data: { channel: serializeChannel(data) },
  });
};

const deleteChannel = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(CHANNELS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("cara pembayaran: cek kanal sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound("Kanal pembayaran", id);

  const { error } = await supabase.from(CHANNELS_TABLE).delete().eq("id", id);
  if (error) throwDbError("cara pembayaran: hapus kanal", error);

  return res.json({ success: true, message: "Kanal pembayaran berhasil dihapus" });
};

module.exports = {
  getSettings,
  updateSettings,
  listVaSteps,
  getVaStep,
  createVaStep,
  updateVaStep,
  deleteVaStep,
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
};

