const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  TERMS_TABLE,
  DEFAULT_RESIGNATION_SETTINGS,
  DEFAULT_RESIGNATION_TERMS,
  serializeResignationSettings,
  serializeResignationTerm,
} = require("../services/resignationService");

const getPublicResignation = async (req, res) => {
  // 1. Pengaturan Teks
  let settings = { ...DEFAULT_RESIGNATION_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", "main").maybeSingle();
    if (!error && data) {
      settings = serializeResignationSettings(data);
    }
  } catch (err) {
    console.error("[RESIGNATION PUBLIC] Gagal membaca settings:", err.message);
  }

  // 2. Butir Syarat & Ketentuan (Terms)
  let terms = DEFAULT_RESIGNATION_TERMS.map((t) => serializeResignationTerm(t, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase.from(TERMS_TABLE).select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(TERMS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        terms = data.map((row) => serializeResignationTerm(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[RESIGNATION PUBLIC] Gagal membaca terms:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      terms,
    },
  });
};

module.exports = {
  getPublicResignation,
};

