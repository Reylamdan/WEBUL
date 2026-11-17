const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  SETTINGS_TABLE,
  STEPS_TABLE,
  REQUIREMENTS_TABLE,
  SCHEDULES_TABLE,
  FEES_TABLE,
  serializeRplSettings,
  serializeStep,
  serializeRequirement,
  serializeSchedule,
  serializeFee,
  itemNotFound,
} = require("../services/rplService");

const RANGE_NOT_SATISFIABLE = "PGRST103";
const CHECK_VIOLATION = "23514";

const throwWriteError = (context, error) => {
  if (error && error.code === CHECK_VIOLATION) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

// ==================== 1. PENGATURAN TEKS & INFORMASI UMUM RPL ====================

const getSettings = async (req, res) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[RPL ADMIN] DB error getSettings:", error.message);
  }

  return res.json({
    success: true,
    data: {
      settings: serializeRplSettings(data),
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
  if (b.heroArtMark !== undefined) payload.hero_art_mark = b.heroArtMark;
  if (b.heroArtCaption !== undefined) payload.hero_art_caption = b.heroArtCaption;
  if (b.sectionEyebrow !== undefined) payload.section_eyebrow = b.sectionEyebrow;
  if (b.sectionTitle !== undefined) payload.section_title = b.sectionTitle;
  if (b.benefits !== undefined) payload.benefits = b.benefits;
  if (b.scheduleNote !== undefined) payload.schedule_note = b.scheduleNote;
  if (b.registrationDeadline !== undefined) payload.registration_deadline = b.registrationDeadline;
  if (b.registrationUrl !== undefined) payload.registration_url = b.registrationUrl;
  if (b.transferCreditTitle !== undefined) payload.transfer_credit_title = b.transferCreditTitle;
  if (b.transferCreditDescription !== undefined) payload.transfer_credit_description = b.transferCreditDescription;

  const existing = await supabase.from(SETTINGS_TABLE).select("id").eq("id", "main").maybeSingle();

  let result;
  if (!existing.data) {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .insert({ id: "main", ...payload })
      .select("*")
      .single();
    if (error) throwWriteError("jalur rpl: buat pengaturan", error);
    result = data;
  } else {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(payload)
      .eq("id", "main")
      .select("*")
      .single();
    if (error) throwWriteError("jalur rpl: perbarui pengaturan", error);
    result = data;
  }

  return res.json({
    success: true,
    message: "Pengaturan jalur RPL berhasil diperbarui",
    data: {
      settings: serializeRplSettings(result),
    },
  });
};

// ==================== 2. CRUD ALUR PENDAFTARAN (STEPS) ====================

const listSteps = async (req, res) => {
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
    supabase.from(STEPS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(STEPS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("jalur rpl: hitung total steps", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("jalur rpl: daftar alur", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeStep(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

const getStep = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(STEPS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("jalur rpl: ambil alur", error);
  if (!data) throw itemNotFound("Tahapan alur", id);

  return res.json({ success: true, data: { step: serializeStep(data) } });
};

const createStep = async (req, res) => {
  const body = req.body;
  const payload = {
    title: body.title,
    description: body.description,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(STEPS_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("jalur rpl: buat alur", error);

  return res.status(201).json({
    success: true,
    message: "Tahapan alur pendaftaran berhasil ditambahkan",
    data: { step: serializeStep(data) },
  });
};

const updateStep = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(STEPS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek alur", existing.error);
  if (!existing.data) throw itemNotFound("Tahapan alur", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) payload.title = body.title;
  if (body.description !== undefined) payload.description = body.description;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(STEPS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("jalur rpl: perbarui alur", error);

  return res.json({
    success: true,
    message: "Tahapan alur pendaftaran berhasil diperbarui",
    data: { step: serializeStep(data) },
  });
};

const deleteStep = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(STEPS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek alur sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound("Tahapan alur", id);

  const { error } = await supabase.from(STEPS_TABLE).delete().eq("id", id);
  if (error) throwDbError("jalur rpl: hapus alur", error);

  return res.json({ success: true, message: "Tahapan alur berhasil dihapus" });
};

// ==================== 3. CRUD SYARAT & DOKUMEN ====================

const listRequirements = async (req, res) => {
  const { page, limit, status, search, type } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? escapeLikeTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (type) filtered = filtered.eq("type", type);
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.ilike("title", `%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(REQUIREMENTS_TABLE).select("*", { count: "exact" })
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(REQUIREMENTS_TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("jalur rpl: hitung total syarat/dokumen", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("jalur rpl: daftar syarat/dokumen", error);

  const total = count ?? 0;
  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeRequirement(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

const getRequirement = async (req, res) => {
  const { id } = req.validated.params;
  const { data, error } = await supabase.from(REQUIREMENTS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError("jalur rpl: ambil syarat/dokumen", error);
  if (!data) throw itemNotFound("Syarat/Dokumen", id);

  return res.json({ success: true, data: { item: serializeRequirement(data) } });
};

const createRequirement = async (req, res) => {
  const body = req.body;
  const payload = {
    type: body.type,
    title: body.title,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(REQUIREMENTS_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("jalur rpl: buat syarat/dokumen", error);

  return res.status(201).json({
    success: true,
    message: `${body.type === "syarat" ? "Syarat" : "Dokumen"} berhasil ditambahkan`,
    data: { item: serializeRequirement(data) },
  });
};

const updateRequirement = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(REQUIREMENTS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek syarat/dokumen", existing.error);
  if (!existing.data) throw itemNotFound("Syarat/Dokumen", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.type !== undefined) payload.type = body.type;
  if (body.title !== undefined) payload.title = body.title;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(REQUIREMENTS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("jalur rpl: perbarui syarat/dokumen", error);

  return res.json({
    success: true,
    message: "Data syarat/dokumen berhasil diperbarui",
    data: { item: serializeRequirement(data) },
  });
};

const deleteRequirement = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(REQUIREMENTS_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek sebelum hapus syarat/dokumen", existing.error);
  if (!existing.data) throw itemNotFound("Syarat/Dokumen", id);

  const { error } = await supabase.from(REQUIREMENTS_TABLE).delete().eq("id", id);
  if (error) throwDbError("jalur rpl: hapus syarat/dokumen", error);

  return res.json({ success: true, message: "Data syarat/dokumen berhasil dihapus" });
};

// ==================== 4. CRUD JADWAL KULIAH ====================

const listSchedules = async (req, res) => {
  const { data, error } = await supabase
    .from(SCHEDULES_TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throwDbError("jalur rpl: daftar jadwal", error);

  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeSchedule(row)),
    },
  });
};

const createSchedule = async (req, res) => {
  const body = req.body;
  const payload = {
    day: body.day,
    hours: body.hours,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(SCHEDULES_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("jalur rpl: buat jadwal", error);

  return res.status(201).json({
    success: true,
    message: "Jadwal kuliah berhasil ditambahkan",
    data: { item: serializeSchedule(data) },
  });
};

const updateSchedule = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(SCHEDULES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek jadwal", existing.error);
  if (!existing.data) throw itemNotFound("Jadwal kuliah", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.day !== undefined) payload.day = body.day;
  if (body.hours !== undefined) payload.hours = body.hours;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(SCHEDULES_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("jalur rpl: perbarui jadwal", error);

  return res.json({
    success: true,
    message: "Jadwal kuliah berhasil diperbarui",
    data: { item: serializeSchedule(data) },
  });
};

const deleteSchedule = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(SCHEDULES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek jadwal sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound("Jadwal kuliah", id);

  const { error } = await supabase.from(SCHEDULES_TABLE).delete().eq("id", id);
  if (error) throwDbError("jalur rpl: hapus jadwal", error);

  return res.json({ success: true, message: "Jadwal kuliah berhasil dihapus" });
};

// ==================== 5. CRUD RINCIAN BIAYA ====================

const listFees = async (req, res) => {
  const { data, error } = await supabase
    .from(FEES_TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throwDbError("jalur rpl: daftar biaya", error);

  return res.json({
    success: true,
    data: {
      items: (data || []).map((row) => serializeFee(row)),
    },
  });
};

const createFee = async (req, res) => {
  const body = req.body;
  const payload = {
    type: body.type,
    amount: body.amount,
    sort_order: body.sortOrder ?? 0,
    status: body.status ?? "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(FEES_TABLE).insert(payload).select("*").single();
  if (error) throwWriteError("jalur rpl: buat biaya", error);

  return res.status(201).json({
    success: true,
    message: "Komponen biaya berhasil ditambahkan",
    data: { item: serializeFee(data) },
  });
};

const updateFee = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const existing = await supabase.from(FEES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek biaya", existing.error);
  if (!existing.data) throw itemNotFound("Komponen biaya", id);

  const payload = { updated_at: new Date().toISOString() };
  if (body.type !== undefined) payload.type = body.type;
  if (body.amount !== undefined) payload.amount = body.amount;
  if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;
  if (body.status !== undefined) payload.status = body.status;

  const { data, error } = await supabase.from(FEES_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throwWriteError("jalur rpl: perbarui biaya", error);

  return res.json({
    success: true,
    message: "Komponen biaya berhasil diperbarui",
    data: { item: serializeFee(data) },
  });
};

const deleteFee = async (req, res) => {
  const { id } = req.validated.params;

  const existing = await supabase.from(FEES_TABLE).select("id").eq("id", id).maybeSingle();
  if (existing.error) throwDbError("jalur rpl: cek biaya sebelum hapus", existing.error);
  if (!existing.data) throw itemNotFound("Komponen biaya", id);

  const { error } = await supabase.from(FEES_TABLE).delete().eq("id", id);
  if (error) throwDbError("jalur rpl: hapus biaya", error);

  return res.json({ success: true, message: "Komponen biaya berhasil dihapus" });
};

module.exports = {
  getSettings,
  updateSettings,
  listSteps,
  getStep,
  createStep,
  updateStep,
  deleteStep,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listFees,
  createFee,
  updateFee,
  deleteFee,
};

