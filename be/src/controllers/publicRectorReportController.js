const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  REPORTS_TABLE,
  DEFAULT_RECTOR_REPORTS,
  serializeRectorReportSettings,
  serializeRectorReport,
} = require("../services/rectorReportService");

const getPublicData = async (req, res) => {
  // 1. Ambil pengaturan halaman
  const { data: settingsData, error: settingsError } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (settingsError && settingsError.code !== "PGRST116") {
    console.error("[PUBLIC RECTOR REPORTS] Error getSettings:", settingsError.message);
  }

  // 2. Ambil data laporan tahunan yang dipublikasikan
  const { data: reportsData, error: reportsError } = await supabase
    .from(REPORTS_TABLE)
    .select("*")
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  let reports;
  if (reportsError) {
    console.warn("[PUBLIC RECTOR REPORTS] DB error, using default fallback:", reportsError.message);
    reports = DEFAULT_RECTOR_REPORTS.filter((r) => r.status === "published");
  } else if (!reportsData || reportsData.length === 0) {
    reports = DEFAULT_RECTOR_REPORTS.filter((r) => r.status === "published");
  } else {
    reports = reportsData.map((row) => serializeRectorReport(row, { includeStatus: false }));
  }

  return res.json({
    success: true,
    data: {
      settings: serializeRectorReportSettings(settingsData),
      reports,
    },
  });
};

module.exports = {
  getPublicData,
};

