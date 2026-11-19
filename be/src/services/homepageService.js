const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { getCoverPublicUrl } = require("../utils/coverStorage");
const { MEDIA_TABLE } = require("./videoStorageService");

const SETTINGS_TABLE = "homepage_settings";
const PHOTOS_TABLE = "homepage_photos";
const VIDEOS_TABLE = "homepage_videos";
const VIDEO_MODULE = "homepage-videos";

// Teks bawaan = isi beranda FE sebelum bisa diubah admin.
// Section yang belum pernah disimpan admin memakai nilai ini.
const DEFAULT_CONTENT = {
  hero: {
    imageNote: "KAMPUS UNIVERSITAS LIA · VIDEO PREVIEW",
    caption: "Tempat ide tumbuh dan masa depan dimulai",
    eyebrow: "UNIVERSITAS LIA",
    titleLine1: "Empowering Minds,",
    titleLine2: "Inspiring Futures.",
    description:
      "Belajar bahasa, teknologi, dan bisnis bersama komunitas yang mendukungmu tumbuh dan siap menghadapi dunia.",
    primaryLabel: "Temukan program studi",
    primaryHref: "#program",
    secondaryLabel: "Kenali Universitas LIA",
    secondaryHref: "/profil",
  },
  about: {
    eyebrow: "TENTANG UNIVERSITAS LIA",
    title: "Transformasi STIA LIA menjadi Universitas LIA",
    lead: "Perjalanan baru untuk menghadirkan pendidikan yang relevan, inklusif, dan siap menjawab kebutuhan masa depan.",
    values: [
      { icon: "sparkle", title: "Pendidikan berkualitas", description: "Belajar dari pengajar berpengalaman" },
      { icon: "globe", title: "Wawasan global", description: "Bekal untuk berkiprah tanpa batas" },
      { icon: "graduate", title: "Siap menghadapi masa depan", description: "Kompetensi yang relevan dengan industri" },
    ],
    linkLabel: "Tentang Universitas LIA",
    linkHref: "/profil",
    mediaLabel: "LEARNING WITHOUT LIMITS",
    mediaCaption: "Cerita Universitas LIA",
  },
  programs: {
    eyebrow: "TEMUKAN MINATMU",
    title: "Belajar sesuatu yang berarti",
    lead: "Pilih program yang sesuai dengan rasa ingin tahu dan cita-citamu.",
    linkLabel: "Lihat semua program",
    linkHref: "/akademik/fakultas",
    items: [
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Desain Komunikasi Visual", code: "S1 · 8 semester", color: "coral", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Inggris", code: "S1 · 8 semester", color: "blue", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Jepang", code: "S1 · 8 semester", color: "yellow", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Bisnis Digital", code: "S1 · 8 semester", color: "green", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Sistem Informasi", code: "S1 · 8 semester", color: "lavender", href: "/akademik/fakultas" },
      { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Informatika", code: "S1 · 8 semester", color: "orange", href: "/akademik/fakultas" },
    ],
  },
  campusLife: {
    eyebrow: "LEBIH DARI RUANG KELAS",
    title: "Jalani pengalaman kampus yang penuh cerita",
    description:
      "Temukan teman, kembangkan minat, dan ciptakan pengalaman berharga bersama komunitas Universitas LIA.",
    linkLabel: "Jelajahi kehidupan kampus",
    linkHref: "/kehidupan-kampus/kegiatan-mahasiswa",
    photoLabel: "HARI-HARI DI KAMPUS",
  },
  admission: {
    eyebrow: "PENERIMAAN MAHASISWA BARU",
    title: "When Technology Meets Language Expertise.",
    description:
      "Kenali informasi jalur pendaftaran, beasiswa, dan biaya kuliah sebelum memulai proses pendaftaran.",
    primaryLabel: "Daftar Sekarang",
    primaryHref: "/pmb",
    secondaryLabel: "Informasi jalur pendaftaran",
    secondaryHref: "/pmb#jalur-pendaftaran",
  },
  quickLinks: [
    { name: "SIAKAD UL", detail: "Sistem informasi akademik", icon: "graduate", href: "#footer" },
    { name: "E-Learning", detail: "Pembelajaran melalui Edlink", icon: "monitor", href: "#footer" },
    { name: "Perpustakaan", detail: "Sumber belajar dan referensi", icon: "book", href: "#footer" },
    { name: "Informasi PMB", detail: "Panduan calon mahasiswa", icon: "file", href: "/pmb" },
    { name: "E-Journal", detail: "Publikasi ilmiah dan jurnal", icon: "book", href: "#footer" },
  ],
  partners: {
    title: "Mitra Kami",
    items: ["lia", "digital", "global", "edu", "creative", "tech", "language", "future", "media", "institute", "connect", "learning"],
  },
};

const CHECK_VIOLATION = "23514";
const INPUT_ERROR_CODES = [CHECK_VIOLATION, "23502", "22P02"];

const mapWriteError = (context, error) => {
  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  try {
    throwDbError(context, error);
  } catch (appError) {
    return appError;
  }
  return error;
};

const photoNotFound = () => new AppError("Foto beranda tidak ditemukan", 404, "HOMEPAGE_PHOTO_NOT_FOUND");
const videoNotFound = () => new AppError("Video beranda tidak ditemukan", 404, "HOMEPAGE_VIDEO_NOT_FOUND");

// ---------- KONTEN TEKS ----------

const mergeContent = (stored) => {
  const content = {};
  for (const key of Object.keys(DEFAULT_CONTENT)) {
    content[key] = stored && stored[key] !== undefined ? stored[key] : DEFAULT_CONTENT[key];
  }
  return content;
};

const readStored = async () => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("content, updated_at")
    .eq("id", "main")
    .maybeSingle();

  if (error) throwDbError(`${SETTINGS_TABLE}: ambil`, error);
  return data;
};

const getContent = async () => {
  const row = await readStored();
  return { content: mergeContent(row && row.content), updatedAt: row ? row.updated_at : null };
};

// Section yang dikirim menggantikan section lama; section lain dibiarkan.
const updateContent = async (sections) => {
  const row = await readStored();
  const next = { ...((row && row.content) || {}), ...sections };

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "main", content: next, updated_at: new Date().toISOString() })
    .select("content, updated_at")
    .single();

  if (error) throw mapWriteError(`${SETTINGS_TABLE}: simpan`, error);
  return { content: mergeContent(data.content), updatedAt: data.updated_at };
};

// Mengembalikan satu section ke teks bawaan.
const resetSection = async (key) => {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_CONTENT, key)) {
    throw new AppError("Section beranda tidak dikenal", 404, "HOMEPAGE_SECTION_NOT_FOUND");
  }
  const row = await readStored();
  const next = { ...((row && row.content) || {}) };
  delete next[key];

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "main", content: next, updated_at: new Date().toISOString() })
    .select("content, updated_at")
    .single();

  if (error) throw mapWriteError(`${SETTINGS_TABLE}: reset`, error);
  return { content: mergeContent(data.content), updatedAt: data.updated_at };
};

// ---------- FOTO ----------

const serializePhoto = (row, { admin }) => {
  const item = {
    id: row.id,
    placement: row.placement,
    title: row.title,
    caption: row.caption || "",
    imageUrl: getCoverPublicUrl(row.image_path),
    sortOrder: row.sort_order,
  };
  if (admin) {
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }
  return item;
};

const photoPatch = (body) => {
  const map = { placement: "placement", title: "title", caption: "caption", sortOrder: "sort_order", status: "status" };
  const patch = {};
  for (const [field, column] of Object.entries(map)) {
    if (body[field] !== undefined) patch[column] = body[field];
  }
  return patch;
};

const adminListPhotos = async ({ placement, status }) => {
  let query = supabase.from(PHOTOS_TABLE).select("*");
  if (placement) query = query.eq("placement", placement);
  if (status) query = query.eq("status", status);

  const { data, error } = await query
    .order("placement", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throwDbError(`${PHOTOS_TABLE}: daftar`, error);
  return { items: (data || []).map((row) => serializePhoto(row, { admin: true })) };
};

const findPhotoRow = async (id, context) => {
  const { data, error } = await supabase.from(PHOTOS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const adminGetPhoto = async (id) => {
  const row = await findPhotoRow(id, `${PHOTOS_TABLE}: detail`);
  if (!row) throw photoNotFound();
  return serializePhoto(row, { admin: true });
};

const adminCreatePhoto = async (body) => {
  const { data, error } = await supabase
    .from(PHOTOS_TABLE)
    .insert({
      placement: body.placement,
      title: body.title,
      caption: body.caption || "",
      sort_order: body.sortOrder ?? 0,
      status: body.status || "draft",
    })
    .select("*")
    .single();

  if (error) throw mapWriteError(`${PHOTOS_TABLE}: buat`, error);
  return serializePhoto(data, { admin: true });
};

const adminUpdatePhoto = async (id, body) => {
  const patch = { ...photoPatch(body), updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from(PHOTOS_TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw mapWriteError(`${PHOTOS_TABLE}: perbarui`, error);
  if (!data) throw photoNotFound();
  return serializePhoto(data, { admin: true });
};

// Mengembalikan path gambar lama agar controller menghapusnya dari storage.
const adminDeletePhoto = async (id) => {
  const { data, error } = await supabase
    .from(PHOTOS_TABLE)
    .delete()
    .eq("id", id)
    .select("id, image_path")
    .maybeSingle();

  if (error) throwDbError(`${PHOTOS_TABLE}: hapus`, error);
  if (!data) throw photoNotFound();
  return data.image_path;
};

const adminSetPhotoImage = async (id, imagePath) => {
  const { data, error } = await supabase
    .from(PHOTOS_TABLE)
    .update({ image_path: imagePath, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw mapWriteError(`${PHOTOS_TABLE}: simpan gambar`, error);
  if (!data) throw photoNotFound();
  return serializePhoto(data, { admin: true });
};

// ---------- VIDEO ----------

const serializeMedia = (row) =>
  row
    ? {
        id: row.id,
        url: row.secure_url,
        thumbnailUrl: row.thumbnail_url,
        format: row.format,
        bytes: row.bytes,
        duration: row.duration,
      }
    : null;

const loadMediaMap = async (ids) => {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from(MEDIA_TABLE)
    .select("*")
    .eq("owner_module", VIDEO_MODULE)
    .eq("status", "active")
    .in("record_id", ids);

  if (error) throwDbError(`${MEDIA_TABLE}: video beranda`, error);
  return new Map((data || []).map((row) => [row.record_id, row]));
};

const serializeVideos = async (rows, { admin }) => {
  const media = await loadMediaMap(rows.map((row) => row.id));

  return rows.map((row) => {
    const item = {
      id: row.id,
      title: row.title,
      description: row.description || "",
      sortOrder: row.sort_order,
      video: serializeMedia(media.get(row.id)),
    };
    if (admin) {
      item.status = row.status;
      item.createdAt = row.created_at;
      item.updatedAt = row.updated_at;
    }
    return item;
  });
};

const adminListVideos = async ({ status }) => {
  let query = supabase.from(VIDEOS_TABLE).select("*");
  if (status) query = query.eq("status", status);

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throwDbError(`${VIDEOS_TABLE}: daftar`, error);
  return { items: await serializeVideos(data || [], { admin: true }) };
};

const adminGetVideo = async (id) => {
  const { data, error } = await supabase.from(VIDEOS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throwDbError(`${VIDEOS_TABLE}: detail`, error);
  if (!data) throw videoNotFound();
  return (await serializeVideos([data], { admin: true }))[0];
};

const adminCreateVideo = async (body) => {
  const { data, error } = await supabase
    .from(VIDEOS_TABLE)
    .insert({
      title: body.title,
      description: body.description || "",
      sort_order: body.sortOrder ?? 0,
      status: body.status || "draft",
    })
    .select("*")
    .single();

  if (error) throw mapWriteError(`${VIDEOS_TABLE}: buat`, error);
  return (await serializeVideos([data], { admin: true }))[0];
};

const adminUpdateVideo = async (id, body) => {
  const patch = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
  if (body.status !== undefined) patch.status = body.status;

  const { data, error } = await supabase
    .from(VIDEOS_TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw mapWriteError(`${VIDEOS_TABLE}: perbarui`, error);
  if (!data) throw videoNotFound();
  return (await serializeVideos([data], { admin: true }))[0];
};

const adminDeleteVideo = async (id) => {
  const { data, error } = await supabase
    .from(VIDEOS_TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throwDbError(`${VIDEOS_TABLE}: hapus`, error);
  if (!data) throw videoNotFound();
};

// ---------- PUBLIK ----------

const publicGet = async () => {
  const [{ content }, photosRes, videosRes] = await Promise.all([
    getContent(),
    supabase
      .from(PHOTOS_TABLE)
      .select("*")
      .eq("status", "published")
      .not("image_path", "is", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from(VIDEOS_TABLE)
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (photosRes.error) throwDbError(`${PHOTOS_TABLE}: publik`, photosRes.error);
  if (videosRes.error) throwDbError(`${VIDEOS_TABLE}: publik`, videosRes.error);

  const photos = { hero: [], about: [], campusLife: [] };
  for (const row of photosRes.data || []) {
    const key = row.placement === "campus_life" ? "campusLife" : row.placement;
    if (photos[key]) photos[key].push(serializePhoto(row, { admin: false }));
  }

  // Hanya video yang sudah punya file yang tampil di website.
  const videos = (await serializeVideos(videosRes.data || [], { admin: false })).filter(
    (item) => item.video
  );

  return { content, photos, videos };
};

module.exports = {
  VIDEO_MODULE,
  DEFAULT_CONTENT,
  getContent,
  updateContent,
  resetSection,
  adminListPhotos,
  adminGetPhoto,
  adminCreatePhoto,
  adminUpdatePhoto,
  adminDeletePhoto,
  adminSetPhotoImage,
  findPhotoRow,
  adminListVideos,
  adminGetVideo,
  adminCreateVideo,
  adminUpdateVideo,
  adminDeleteVideo,
  publicGet,
};
