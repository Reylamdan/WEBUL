const supabase = require("../config/supabase");

const DB_CHECK_TIMEOUT_MS = 5000;

// Cek koneksi ke Supabase TANPA bergantung pada tabel apa pun.
// listBuckets() hanya memerlukan URL dan service role key yang valid.
const checkSupabase = async () => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Timeout saat menghubungi Supabase")),
      DB_CHECK_TIMEOUT_MS
    );
  });

  try {
    const { error } = await Promise.race([supabase.storage.listBuckets(), timeout]);
    if (error) throw error;
    return true;
  } finally {
    clearTimeout(timer);
  }
};

const getHealth = async (req, res) => {
  let databaseOk = false;

  try {
    databaseOk = await checkSupabase();
  } catch (error) {
    // Detail error hanya dicatat di server, tidak dikirim ke klien
    console.error("[HEALTH] Pengecekan Supabase gagal:", error.message);
  }

  const status = databaseOk ? 200 : 503;

  return res.status(status).json({
    success: databaseOk,
    message: databaseOk
      ? "Server dan koneksi Supabase berhasil"
      : "Server aktif, tetapi koneksi Supabase bermasalah",
    data: {
      server: "ok",
      supabase: databaseOk ? "ok" : "unavailable",
    },
  });
};

module.exports = { getHealth };