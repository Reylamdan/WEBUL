const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  VA_STEPS_TABLE,
  CHANNELS_TABLE,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_VA_STEPS,
  DEFAULT_CHANNELS,
  serializePaymentSettings,
  serializeVaStep,
  serializeChannel,
} = require("../services/paymentGuideService");

const getPublicPaymentGuide = async (req, res) => {
  // 1. Pengaturan Teks & Gambar
  let settings = { ...DEFAULT_PAYMENT_SETTINGS, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", "main").maybeSingle();
    if (!error && data) {
      settings = serializePaymentSettings(data);
    }
  } catch (err) {
    console.error("[PAYMENT PUBLIC] Gagal membaca settings:", err.message);
  }

  // 2. Langkah SiAkad (VA Steps)
  let vaSteps = DEFAULT_VA_STEPS.map((s) => serializeVaStep(s, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase.from(VA_STEPS_TABLE).select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(VA_STEPS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        vaSteps = data.map((row) => serializeVaStep(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[PAYMENT PUBLIC] Gagal membaca vaSteps:", err.message);
  }

  // 3. Kanal Pembayaran (Channels)
  let channels = DEFAULT_CHANNELS.map((c) => serializeChannel(c, { includeStatus: false }));
  try {
    const { count, error: countErr } = await supabase.from(CHANNELS_TABLE).select("id", { count: "exact", head: true });
    if (!countErr && typeof count === "number" && count > 0) {
      const { data, error } = await supabase
        .from(CHANNELS_TABLE)
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        channels = data.map((row) => serializeChannel(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[PAYMENT PUBLIC] Gagal membaca channels:", err.message);
  }

  return res.json({
    success: true,
    data: {
      settings,
      vaSteps,
      channels,
    },
  });
};

module.exports = {
  getPublicPaymentGuide,
};

