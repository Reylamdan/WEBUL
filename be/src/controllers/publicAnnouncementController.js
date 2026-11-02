const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

const RANGE_NOT_SATISFIABLE = "PGRST103";

// Daftar publik tidak memuat content_html agar hemat bandwidth
const PUBLIC_LIST_COLUMNS =
  "id, title, slug, excerpt, published_at, created_at, author:admins(id, name)";
const PUBLIC_DETAIL_COLUMNS =
  "id, title, slug, excerpt, content_html, published_at, created_at, updated_at, author:admins(id, name)";

const serializePublicAnnouncement = (row) => {
  const announcement = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    author: row.author ? { id: row.author.id, name: row.author.name } : null,
    createdAt: row.created_at,
  };
  if (row.updated_at !== undefined) announcement.updatedAt = row.updated_at;
  if (row.content_html !== undefined) announcement.contentHtml = row.content_html;
  return announcement;
};

const cleanSearchTerm = (term) =>
  term
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const announcementNotFound = () =>
  new AppError("Pengumuman tidak ditemukan", 404, "ANNOUNCEMENT_NOT_FOUND");

// ---------------------------------------------------------------------
// GET /api/announcements
// ---------------------------------------------------------------------
const listPublicAnnouncements = async (req, res) => {
  const { page, limit, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? cleanSearchTerm(search) : "";
  const now = new Date().toISOString();

  const applyFilters = (query) => {
    let filtered = query
      .eq("status", "published")
      .lte("published_at", now);

    if (term) {
      filtered = filtered.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
    }
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from("announcements").select(PUBLIC_LIST_COLUMNS, { count: "exact" })
  )
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("announcements").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("public announcements: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("public announcements: daftar", error);

  const total = count ?? 0;

  return res.json({
    success: true,
    data: {
      items: data.map(serializePublicAnnouncement),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/announcements/:slug
// ---------------------------------------------------------------------
const getPublicAnnouncement = async (req, res) => {
  const { slug } = req.validated.params;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("announcements")
    .select(PUBLIC_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", now)
    .maybeSingle();

  if (error) throwDbError("public announcements: detail", error);
  if (!data) throw announcementNotFound();

  return res.json({
    success: true,
    data: { announcement: serializePublicAnnouncement(data) },
  });
};

module.exports = {
  listPublicAnnouncements,
  getPublicAnnouncement,
  serializePublicAnnouncement,
};
