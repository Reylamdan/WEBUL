const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  WAVES_TABLE,
  DEFAULT_REGISTRATION_SETTINGS,
  DEFAULT_REGISTRATION_WAVES,
  serializeRegistrationSettings,
  serializeRegistrationWave,
} = require("../services/registrationPeriodService");

const getPublicRegistrationPeriod = async (req, res) => {
  // 1. Ambil pengaturan teks hero & tahapan
  let settings = { ...DEFAULT_REGISTRATION_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (!error && data) {
      settings = serializeRegistrationSettings(data);
    }
  } catch (err) {
    console.error("[REGISTRATION PERIOD] Gagal membaca settings:", err.message);
  }

  // 2. Ambil gelombang pendaftaran berstatus published
  let waves = DEFAULT_REGISTRATION_WAVES.map((w) => ({
    id: w.id,
    name: w.name,
    label: w.label,
    activities: w.activities,
    sortOrder: w.sortOrder,
  }));
  try {
    const { count, error: countErr } = await supabase
      .from(WAVES_TABLE)
      .select("id", { count: "exact", head: true });

    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(WAVES_TABLE)
        .select("id, name, label, activities, sort_order, created_at, updated_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        waves = data.map((row) => serializeRegistrationWave(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[REGISTRATION PERIOD] Gagal membaca waves:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      waves,
    },
  });
};

module.exports = {
  getPublicRegistrationPeriod,
};

