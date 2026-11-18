const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  ITEMS_TABLE,
  DEFAULT_UKM_SETTINGS,
  DEFAULT_UKM_CATEGORIES,
  DEFAULT_UKM_ITEMS,
  serializeUkmSettings,
  serializeUkmItem,
} = require("../services/ukmService");

const getPublicUkm = async (req, res) => {
  // 1. Pengaturan Teks (Settings)
  let settings = { ...DEFAULT_UKM_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", "main").maybeSingle();
    if (!error && data) {
      settings = serializeUkmSettings(data);
    }
  } catch (err) {
    console.error("[UKM PUBLIC] Gagal membaca settings:", err.message);
  }

  // 2. Butir UKM (Items)
  let items = DEFAULT_UKM_ITEMS.map((item) => serializeUkmItem(item, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase
      .from(ITEMS_TABLE)
      .select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(ITEMS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        items = data.map((row) => serializeUkmItem(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[UKM PUBLIC] Gagal membaca items:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      items,
      categories: DEFAULT_UKM_CATEGORIES,
    },
  });
};

module.exports = {
  getPublicUkm,
};

