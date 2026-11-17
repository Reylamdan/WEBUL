const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  STEPS_TABLE,
  REQUIREMENTS_TABLE,
  SCHEDULES_TABLE,
  FEES_TABLE,
  DEFAULT_RPL_SETTINGS,
  DEFAULT_RPL_STEPS,
  DEFAULT_RPL_REQUIREMENTS,
  DEFAULT_RPL_SCHEDULES,
  DEFAULT_RPL_FEES,
  serializeRplSettings,
  serializeStep,
  serializeRequirement,
  serializeSchedule,
  serializeFee,
} = require("../services/rplService");

const getPublicRpl = async (req, res) => {
  // 1. Pengaturan Teks
  let settings = { ...DEFAULT_RPL_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", "main").maybeSingle();
    if (!error && data) {
      settings = serializeRplSettings(data);
    }
  } catch (err) {
    console.error("[RPL PUBLIC] Gagal membaca settings:", err.message);
  }

  // 2. Alur Pendaftaran (Steps)
  let steps = DEFAULT_RPL_STEPS.map((s) => serializeStep(s, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase.from(STEPS_TABLE).select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(STEPS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        steps = data.map((row) => serializeStep(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[RPL PUBLIC] Gagal membaca steps:", err.message);
  }

  // 3. Syarat & Dokumen
  let requirements = DEFAULT_RPL_REQUIREMENTS.filter((r) => r.type === "syarat").map((r) =>
    serializeRequirement(r, { includeStatus: false })
  );
  let documents = DEFAULT_RPL_REQUIREMENTS.filter((r) => r.type === "dokumen").map((r) =>
    serializeRequirement(r, { includeStatus: false })
  );
  try {
    const { count, error: countErr } = await supabase
      .from(REQUIREMENTS_TABLE)
      .select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(REQUIREMENTS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        requirements = data
          .filter((r) => r.type === "syarat")
          .map((r) => serializeRequirement(r, { includeStatus: false }));
        documents = data
          .filter((r) => r.type === "dokumen")
          .map((r) => serializeRequirement(r, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[RPL PUBLIC] Gagal membaca requirements:", err.message);
  }

  // 4. Jadwal Kuliah
  let schedules = DEFAULT_RPL_SCHEDULES.map((s) => serializeSchedule(s, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase
      .from(SCHEDULES_TABLE)
      .select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(SCHEDULES_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        schedules = data.map((row) => serializeSchedule(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[RPL PUBLIC] Gagal membaca schedules:", err.message);
  }

  // 5. Rincian Biaya
  let fees = DEFAULT_RPL_FEES.map((f) => serializeFee(f, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase.from(FEES_TABLE).select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(FEES_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        fees = data.map((row) => serializeFee(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[RPL PUBLIC] Gagal membaca fees:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      steps,
      requirements,
      documents,
      schedules,
      fees,
    },
  });
};

module.exports = {
  getPublicRpl,
};

