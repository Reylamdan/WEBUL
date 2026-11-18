const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  REQUIREMENTS_TABLE,
  DEFAULT_FOREIGN_STUDENT_SETTINGS,
  DEFAULT_FOREIGN_STUDENT_REQUIREMENTS,
  serializeForeignStudentSettings,
  serializeForeignStudentRequirement,
} = require("../services/foreignStudentService");

const getPublicForeignStudents = async (req, res) => {
  // 1. Pengaturan Teks (Settings)
  let settings = { ...DEFAULT_FOREIGN_STUDENT_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", "main").maybeSingle();
    if (!error && data) {
      settings = serializeForeignStudentSettings(data);
    }
  } catch (err) {
    console.error("[FOREIGN STUDENTS PUBLIC] Gagal membaca settings:", err.message);
  }

  // 2. Butir Persyaratan (Requirements)
  let requirements = DEFAULT_FOREIGN_STUDENT_REQUIREMENTS.map((r) =>
    serializeForeignStudentRequirement(r, { includeStatus: false })
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
        requirements = data.map((row) =>
          serializeForeignStudentRequirement(row, { includeStatus: false })
        );
      }
    }
  } catch (err) {
    console.error("[FOREIGN STUDENTS PUBLIC] Gagal membaca requirements:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      requirements,
    },
  });
};

module.exports = {
  getPublicForeignStudents,
};

