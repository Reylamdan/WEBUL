// Pembersihan aset media Cloudinary yang yatim (tercatat di media_cleanup_queue).
//
//   npm run media:cleanup
//
// Skrip ini memproses antrean media_cleanup_queue yang gagal dihapus oleh API
// (misalnya karena gangguan jaringan sementara ke Cloudinary).
const supabase = require("../src/config/supabase");
const cloudinaryConfig = require("../src/config/cloudinary");
const { describeProviderError } = require("../src/utils/coverStorage");
const { CLEANUP_QUEUE_TABLE } = require("../src/services/videoStorageService");

const MAX_ATTEMPTS = 10;

const processQueue = async () => {
  if (!cloudinaryConfig.isConfigured()) {
    console.error("Cloudinary belum dikonfigurasi. Jalankan skrip ini setelah kredensial terpasang.");
    process.exit(1);
  }

  const client = cloudinaryConfig.getClient();

  const { data, error } = await supabase
    .from(CLEANUP_QUEUE_TABLE)
    .select("id, public_id, resource_type, attempts, reason")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error(`Gagal membaca antrean cleanup: ${error.message}`);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("Antrean pembersihan media Cloudinary kosong. Tidak ada aset yatim.");
    return;
  }

  console.log(`Memproses antrean pembersihan: ${data.length} aset...`);
  let done = 0;
  let failed = 0;

  for (const item of data) {
    try {
      const res = await client.uploader.destroy(item.public_id, {
        resource_type: item.resource_type || "video",
        type: "upload",
        invalidate: true,
      });

      if (res && (res.result === "ok" || res.result === "not found")) {
        await supabase.from(CLEANUP_QUEUE_TABLE).delete().eq("id", item.id);
        done += 1;
        console.log(`  OK    ${item.public_id} (${item.reason || "-"})`);
      } else {
        throw new Error("Hasil destroy tidak dikenali");
      }
    } catch (e) {
      failed += 1;
      const attempts = (Number(item.attempts) || 0) + 1;
      const errorDesc = describeProviderError(e);
      await supabase
        .from(CLEANUP_QUEUE_TABLE)
        .update({ attempts, last_error: errorDesc })
        .eq("id", item.id);

      console.log(
        `  GAGAL ${item.public_id}: ${errorDesc}${
          attempts >= MAX_ATTEMPTS ? ` (sudah ${MAX_ATTEMPTS}x gagal: periksa manual)` : ""
        }`
      );
    }
  }

  console.log(`\nSelesai: ${done} aset dibersihkan, ${failed} gagal.`);
  if (failed > 0) process.exitCode = 1;
};

if (require.main === module) {
  processQueue().catch((err) => {
    console.error("Kesalahan tak terduga:", err.message);
    process.exit(1);
  });
}

module.exports = { processQueue };

