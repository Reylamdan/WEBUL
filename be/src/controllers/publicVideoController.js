const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { MEDIA_TABLE } = require("../services/videoStorageService");

const videoNotFound = () => new AppError("Video tidak ditemukan", 404, "VIDEO_NOT_FOUND");

const serializePublicVideo = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    module: row.owner_module,
    recordId: row.record_id,
    secureUrl: row.secure_url,
    thumbnailUrl: row.thumbnail_url,
    format: row.format,
    bytes: row.bytes,
    duration: row.duration,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
};

const getPublicVideo = async (req, res) => {
  const { module, recordId } = req.validated.params;

  // Verifikasi apakah konten induk bertatus published
  if (module === "news") {
    const { data: news, error: newsErr } = await supabase
      .from("news")
      .select("id, status, published_at")
      .eq("id", recordId)
      .maybeSingle();

    if (newsErr) throwDbError("public: verifikasi berita untuk video", newsErr);
    if (!news || news.status !== "published" || !news.published_at || new Date(news.published_at) > new Date()) {
      throw videoNotFound();
    }
  } else if (module === "announcements") {
    const { data: ann, error: annErr } = await supabase
      .from("announcements")
      .select("id, status, published_at")
      .eq("id", recordId)
      .maybeSingle();

    if (annErr) throwDbError("public: verifikasi pengumuman untuk video", annErr);
    if (!ann || ann.status !== "published" || !ann.published_at || new Date(ann.published_at) > new Date()) {
      throw videoNotFound();
    }
  } else {
    // Fail closed: modul tanpa verifikasi konten induk tidak pernah dipublikasikan.
    throw videoNotFound();
  }

  const { data: video, error } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("owner_module", module)
    .eq("record_id", recordId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throwDbError("public: ambil video", error);
  if (!video) throw videoNotFound();

  return res.json({
    success: true,
    data: { video: serializePublicVideo(video) },
  });
};

module.exports = {
  getPublicVideo,
  serializePublicVideo,
};

