const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  WAVES_TABLE,
  DEFAULT_TUITION_SETTINGS,
  DEFAULT_TUITION_WAVES,
  serializeTuitionSettings,
  serializeTuitionWave,
} = require("../services/tuitionFeeService");

const getPublicTuitionFees = async (req, res) => {
  // 1. Ambil pengaturan teks hero, heading, dan daftar program studi
  let settings = { ...DEFAULT_TUITION_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (!error && data) {
      settings = serializeTuitionSettings(data);
    }
  } catch (err) {
    console.error("[TUITION FEES] Gagal membaca settings:", err.message);
  }

  // 2. Ambil gelombang biaya berstatus published
  let waves = DEFAULT_TUITION_WAVES.map((w) => ({
    id: w.id,
    name: w.name,
    period: w.period,
    fees: w.fees,
    tuition: w.tuition,
    sortOrder: w.sortOrder,
  }));
  try {
    const { count, error: countErr } = await supabase
      .from(WAVES_TABLE)
      .select("id", { count: "exact", head: true });

    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(WAVES_TABLE)
        .select("id, name, period, fees, sort_order, created_at, updated_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        waves = data.map((row) => serializeTuitionWave(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[TUITION FEES] Gagal membaca waves:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      waves,
      studyPrograms: settings.studyPrograms,
    },
  });
};

module.exports = {
  getPublicTuitionFees,
};

