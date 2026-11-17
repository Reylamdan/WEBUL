const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  FACILITIES_TABLE,
  DEFAULT_FACILITY_SETTINGS,
  DEFAULT_FACILITIES,
  serializeFacilitySettings,
  serializeFacility,
} = require("../services/facilityService");

const getPublicFacilities = async (req, res) => {
  // 1. Ambil pengaturan header halaman fasilitas
  let settings = { ...DEFAULT_FACILITY_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (!error && data) {
      settings = serializeFacilitySettings(data);
    }
  } catch (err) {
    console.error("[FACILITY] Gagal membaca campus_facility_settings:", err.message);
  }

  // 2. Ambil fasilitas kampus berstatus published
  let items = DEFAULT_FACILITIES.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    imageUrl: f.imageUrl,
    sortOrder: f.sortOrder,
  }));
  try {
    const { count, error: countErr } = await supabase
      .from(FACILITIES_TABLE)
      .select("id", { count: "exact", head: true });

    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(FACILITIES_TABLE)
        .select("id, title, description, image_path, sort_order, created_at, updated_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        items = data.map((row) => serializeFacility(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[FACILITY] Gagal membaca campus_facilities:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      items,
    },
  });
};

module.exports = {
  getPublicFacilities,
};

