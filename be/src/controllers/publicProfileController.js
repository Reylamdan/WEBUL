const supabase = require("../config/supabase");
const {
  SETTINGS_TABLE,
  CARDS_TABLE,
  DEFAULT_PROFILE_CONTENT,
  DEFAULT_PROFILE_CARDS,
  serializeProfileContent,
  serializeProfileCard,
} = require("../services/profileService");

const getPublicProfile = async (req, res) => {
  // 1. Ambil pengaturan halaman profil
  let content = { ...DEFAULT_PROFILE_CONTENT, updatedAt: new Date().toISOString() };
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (!error && data) {
      content = serializeProfileContent(data);
    }
  } catch (err) {
    console.error("[PROFILE] Gagal membaca profile_page_settings:", err.message);
  }

  // 2. Ambil kartu jelajahi profil yang berstatus published
  let cards = DEFAULT_PROFILE_CARDS.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    href: c.href,
    sortOrder: c.sortOrder,
  }));
  try {
    // Cek apakah tabel CARDS_TABLE memiliki data
    const { count, error: countErr } = await supabase
      .from(CARDS_TABLE)
      .select("id", { count: "exact", head: true });

    if (!countErr && typeof count === "number" && count > 0) {
      // Jika tabel ada datanya, gunakan data dari DB (hanya yang status published)
      const { data, error } = await supabase
        .from(CARDS_TABLE)
        .select("id, title, description, href, sort_order, created_at, updated_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        cards = data.map((row) => serializeProfileCard(row, { includeStatus: false }));
      }
    }
  } catch (err) {
    console.error("[PROFILE] Gagal membaca profile_cards:", err.message);
  }

  return res.json({
    success: true,
    data: {
      content,
      cards,
    },
  });
};

module.exports = {
  getPublicProfile,
};
