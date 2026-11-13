const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { makeExcerpt } = require("../utils/excerpt");
const { slugify, withSuffix } = require("../utils/slug");

const UNIQUE_VIOLATION = "23505";
const RANGE_NOT_SATISFIABLE = "PGRST103";

const LIST_COLUMNS =
  "id, title, slug, excerpt, status, published_at, created_at, updated_at, author:admins(id, name)";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, content_html`;

const MAX_SLUG_ATTEMPTS = 5;
const SLUG_NUMBERED_CANDIDATES = 20; // base, base-2, ... base-21

// Row database (snake_case) -> response API (camelCase)
const serializeAnnouncement = (row) => {
  const announcement = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    status: row.status,
    publishedAt: row.published_at,
    author: row.author ? { id: row.author.id, name: row.author.name } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.content_html !== undefined) announcement.contentHtml = row.content_html;
  return announcement;
};

// Karakter khusus PostgREST di filter .or() dibersihkan
const cleanSearchTerm = (term) =>
  term
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Memilih slug yang belum dipakai pada tabel announcements
const pickAvailableSlug = async (baseSlug, attempt) => {
  if (attempt >= 2) {
    return withSuffix(baseSlug, crypto.randomBytes(3).toString("hex"), "pengumuman");
  }

  const candidates = [baseSlug];
  for (let n = 2; n < 2 + SLUG_NUMBERED_CANDIDATES; n += 1) {
    candidates.push(withSuffix(baseSlug, String(n), "pengumuman"));
  }

  const { data, error } = await supabase
    .from("announcements")
    .select("slug")
    .in("slug", candidates);
  if (error) throwDbError("announcements: cek slug", error);

  const taken = new Set(data.map((row) => row.slug));
  return (
    candidates.find((candidate) => !taken.has(candidate)) ??
    withSuffix(baseSlug, crypto.randomBytes(3).toString("hex"), "pengumuman")
  );
};

// Mengambil satu pengumuman lengkap
const findAnnouncementById = async (id, context) => {
  const { data, error } = await supabase
    .from("announcements")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const announcementNotFound = () =>
  new AppError("Pengumuman tidak ditemukan", 404, "ANNOUNCEMENT_NOT_FOUND");

// ---------------------------------------------------------------------
// GET /api/admin/announcements
// ---------------------------------------------------------------------
const listAnnouncements = async (req, res) => {
  const { page, limit, status, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? cleanSearchTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (term) filtered = filtered.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from("announcements").select(LIST_COLUMNS, { count: "exact" })
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("announcements").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("announcements: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("announcements: daftar", error);

  const total = count ?? 0;

  return res.json({
    success: true,
    data: {
      items: data.map(serializeAnnouncement),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/announcements/:id
// ---------------------------------------------------------------------
const getAnnouncement = async (req, res) => {
  const announcement = await findAnnouncementById(
    req.validated.params.id,
    "announcements: detail"
  );
  if (!announcement) throw announcementNotFound();

  return res.json({
    success: true,
    data: { announcement: serializeAnnouncement(announcement) },
  });
};

// ---------------------------------------------------------------------
// POST /api/admin/announcements
// ---------------------------------------------------------------------
const createAnnouncement = async (req, res) => {
  const { title, contentHtml, excerpt, status = "draft" } = req.body;

  const finalExcerpt = excerpt || makeExcerpt(contentHtml);
  if (!finalExcerpt) {
    throw new AppError("Isi pengumuman tidak memiliki konten yang layak", 400, "VALIDATION_ERROR");
  }

  const baseSlug = slugify(title, 150, "pengumuman");
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = await pickAvailableSlug(baseSlug, attempt);

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        slug,
        excerpt: finalExcerpt,
        content_html: contentHtml,
        status,
        published_at: publishedAt,
        author_id: req.admin.id,
      })
      .select(DETAIL_COLUMNS)
      .single();

    if (error && error.code === UNIQUE_VIOLATION) continue;
    if (error) throwDbError("announcements: buat", error);

    return res.status(201).json({
      success: true,
      message: "Pengumuman berhasil dibuat",
      data: { announcement: serializeAnnouncement(data) },
    });
  }

  throw new AppError(
    "Gagal membuat slug yang unik, silakan coba lagi",
    409,
    "SLUG_CONFLICT"
  );
};

// ---------------------------------------------------------------------
// PATCH /api/admin/announcements/:id
// ---------------------------------------------------------------------
const updateAnnouncement = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const current = await findAnnouncementById(id, "announcements: ambil untuk update");
  if (!current) throw announcementNotFound();

  const patch = {};

  if (body.title !== undefined) patch.title = body.title;
  if (body.contentHtml !== undefined) patch.content_html = body.contentHtml;

  // Slug tidak berubah otomatis saat judul diedit
  if (body.slug !== undefined && body.slug !== current.slug) patch.slug = body.slug;

  if (body.excerpt !== undefined) {
    const excerpt = body.excerpt || makeExcerpt(body.contentHtml ?? current.content_html);
    if (!excerpt) {
      throw new AppError("Isi pengumuman tidak memiliki konten yang layak", 400, "VALIDATION_ERROR");
    }
    patch.excerpt = excerpt;
  }

  if (body.status !== undefined) {
    patch.status = body.status;
    if (body.status === "published" && !current.published_at) {
      patch.published_at = new Date().toISOString();
    }
  }

  if (Object.keys(patch).length === 0) {
    return res.json({
      success: true,
      message: "Tidak ada perubahan",
      data: { announcement: serializeAnnouncement(current) },
    });
  }

  const { data, error } = await supabase
    .from("announcements")
    .update(patch)
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error && error.code === UNIQUE_VIOLATION) {
    throw new AppError("Slug sudah dipakai pengumuman lain", 409, "SLUG_TAKEN");
  }
  if (error) throwDbError("announcements: perbarui", error);

  if (!data) throw announcementNotFound();

  return res.json({
    success: true,
    message: "Pengumuman berhasil diperbarui",
    data: { announcement: serializeAnnouncement(data) },
  });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/announcements/:id
// ---------------------------------------------------------------------
const deleteAnnouncement = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throwDbError("announcements: hapus", error);

  if (!data || data.length === 0) throw announcementNotFound();

  return res.json({ success: true, message: "Pengumuman berhasil dihapus" });
};

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  serializeAnnouncement,
  LIST_COLUMNS,
  DETAIL_COLUMNS,
};
