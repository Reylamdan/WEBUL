// Pembersihan file Google Drive yang yatim (tidak lagi dirujuk database).
//
//   npm run drive:cleanup                  -> proses antrean drive_cleanup_queue (hapus file yang gagal dihapus sebelumnya)
//   npm run drive:cleanup -- --reconcile   -> DRY-RUN: cari file Drive milik aplikasi yang tidak ada di database
//   npm run drive:cleanup -- --reconcile --apply  -> hapus (sesuai GOOGLE_DRIVE_DELETE_MODE) file yatim yang ditemukan
//
// Rekonsiliasi hanya menyentuh file bertanda appProperties app=lia-be, dan MELEWATI file yang
// berumur kurang dari --grace-minutes (default 60) agar unggahan yang sedang berjalan tidak ikut terhapus.
// File yang masih dirujuk database TIDAK PERNAH dihapus.
const supabase = require("../src/config/supabase");
const drive = require("../src/services/googleDriveService");
const { CLEANUP_TABLE } = require("../src/utils/driveStorage");

const args = () => process.argv.slice(2);
const flag = (name) => args().includes(name);
const option = (name, fallback) => {
  const i = args().indexOf(name);
  return i >= 0 && args()[i + 1] ? args()[i + 1] : fallback;
};
const graceMs = () => Number(option("--grace-minutes", "60")) * 60_000;
const MAX_ATTEMPTS = 10;

const processQueue = async () => {
  const { data, error } = await supabase.from(CLEANUP_TABLE).select("id, file_id, attempts, reason").order("created_at", { ascending: true }).limit(500);
  if (error) throw new Error(`Gagal membaca antrean: ${error.message}`);
  console.log(`Antrean pembersihan: ${data.length} file`);
  let done = 0; let failed = 0;
  for (const item of data) {
    try {
      await drive.removeFile(item.file_id);
      const { error: delError } = await supabase.from(CLEANUP_TABLE).delete().eq("id", item.id);
      if (delError) throw delError;
      done += 1;
      console.log(`  OK    ${item.file_id} (${item.reason})`);
    } catch (e) {
      failed += 1;
      const attempts = (Number(item.attempts) || 0) + 1;
      await supabase.from(CLEANUP_TABLE).update({ attempts, last_error: String(e.message).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", item.id);
      console.log(`  GAGAL ${item.file_id}: ${e.message}${attempts >= MAX_ATTEMPTS ? ` (sudah ${MAX_ATTEMPTS}x gagal: periksa manual)` : ""}`);
    }
  }
  console.log(`Selesai antrean: ${done} dibersihkan, ${failed} gagal`);
  if (failed) process.exitCode = 1;
};

// Semua file ID Drive yang MASIH dirujuk database
const referencedIds = async () => {
  const ids = new Set();
  for (const table of ["accreditation_study_programs", "accreditation_institutions", "banpt_regulations"]) {
    for (let from = 0; ; from += 1000) {
      const cols = table === "banpt_regulations" ? "document_drive_file_id, attachments" : "document_drive_file_id";
      const { data, error } = await supabase.from(table).select(cols).order("id", { ascending: true }).range(from, from + 999);
      if (error) {
        if (error.code === "PGRST103") break;
        throw new Error(`Gagal membaca ${table}: ${error.message}`);
      }
      for (const row of data || []) {
        if (row.document_drive_file_id) ids.add(row.document_drive_file_id);
        for (const a of Array.isArray(row.attachments) ? row.attachments : []) if (a && a.driveFileId) ids.add(a.driveFileId);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return ids;
};

const reconcile = async () => {
  const apply = flag("--apply");
  console.log(`Rekonsiliasi (${apply ? "HAPUS" : "dry-run"}), masa tenggang ${graceMs() / 60000} menit`);
  const referenced = await referencedIds();
  console.log(`File Drive yang dirujuk database: ${referenced.size}`);
  let pageToken; let scanned = 0; const orphans = [];
  do {
    const page = await drive.listAppFiles(pageToken);
    for (const f of page.files || []) {
      scanned += 1;
      if (f.appProperties && f.appProperties.role === "drive-check") continue;
      if (referenced.has(f.id)) continue;
      if (Date.now() - new Date(f.createdTime).getTime() < graceMs()) continue;
      orphans.push(f);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  console.log(`File milik aplikasi di Drive: ${scanned}; yatim: ${orphans.length}`);
  for (const f of orphans) {
    const p = f.appProperties || {};
    console.log(`  ${apply ? "HAPUS" : "YATIM"} ${f.id}  ${f.name}  [${p.category || "?"}/${p.recordId || "?"}/${p.role || "?"}]  ${f.createdTime}`);
    if (apply) { try { await drive.removeFile(f.id); } catch (e) { console.log(`        gagal: ${e.message}`); process.exitCode = 1; } }
  }
  if (!apply && orphans.length) console.log("Tambahkan --apply untuk menghapusnya.");
};

const main = async () => {
  if (!drive.isConfigured()) { console.error("Konfigurasi Google Drive belum diisi di .env"); process.exitCode = 1; return; }
  try {
    if (flag("--reconcile")) await reconcile(); else await processQueue();
  } catch (e) { console.error(`Gagal: ${e.message}`); process.exitCode = 1; }
};

if (require.main === module) main();
module.exports = { processQueue, reconcile, referencedIds, main };
