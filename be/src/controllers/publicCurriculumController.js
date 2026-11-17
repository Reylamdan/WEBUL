const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  PROGRAMS_TABLE,
  DEFAULT_CURRICULUM_SETTINGS,
  DEFAULT_CURRICULUM_PROGRAMS,
  serializeCurriculumSettings,
  serializeCurriculumProgram,
} = require("../services/curriculumService");

const getPublicCurriculum = async (req, res) => {
  // 1. Ambil pengaturan teks kurikulum & OBE
  let settings = { ...DEFAULT_CURRICULUM_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (!error && data) {
      settings = serializeCurriculumSettings(data);
    }
  } catch (err) {
    console.error("[CURRICULUM] Gagal membaca curriculum_settings:", err.message);
  }

  // 2. Ambil program studi berstatus published
  let programs = DEFAULT_CURRICULUM_PROGRAMS.map((p) => ({
    id: p.id,
    name: p.name,
    href: p.href,
    focus: p.focus,
    components: p.components,
    sortOrder: p.sortOrder,
  }));
  try {
    const { count, error: countErr } = await supabase
      .from(PROGRAMS_TABLE)
      .select("id", { count: "exact", head: true });

    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(PROGRAMS_TABLE)
        .select("id, name, href, focus, components, sort_order, created_at, updated_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        programs = data.map((row) => serializeCurriculumProgram(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[CURRICULUM] Gagal membaca curriculum_programs:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      programs,
    },
  });
};

module.exports = {
  getPublicCurriculum,
};

