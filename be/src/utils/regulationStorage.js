const supabase = require("../config/supabase");

// Bucket Supabase LAMA untuk file peraturan BAN-PT. Unggahan baru sekarang ke Google Drive
// (utils/driveStorage); modul ini hanya dipertahankan agar file lama tetap bisa DIBACA (URL publik)
// dan DIHAPUS sampai semuanya dimigrasikan. Tidak ada lagi fungsi unggah ke bucket ini.
const BUCKET = "banpt-regulations";

// URL publik dibentuk dari helper Supabase (bukan string hardcode).
// downloadName (opsional) membuat link yang memaksa unduh dengan nama file tersebut.
const getPublicUrl = (filePath, downloadName) => {
  if (!filePath) return null;
  const options = downloadName ? { download: downloadName } : undefined;
  return supabase.storage.from(BUCKET).getPublicUrl(filePath, options).data.publicUrl;
};

// Best-effort: kegagalan tidak mengubah respons sukses menjadi error.
// File yang tertinggal dicatat sebagai [ORPHAN] untuk dibersihkan manual.
const removeFilesQuietly = async (paths, context) => {
  const list = (paths || []).filter(Boolean);
  if (list.length === 0) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(list);
    if (error) throw error;
  } catch (error) {
    for (const p of list) {
      console.error(`[ORPHAN] ${BUCKET}/${p} (${context}): ${(error && error.message) || error}`);
    }
  }
};

module.exports = {
  BUCKET,
  getPublicUrl,
  removeFilesQuietly,
};
