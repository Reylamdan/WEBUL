const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm } = require("../utils/searchTerm");
const { getCoverPublicUrl } = require("../utils/coverStorage");

// Kode error PostgREST: halaman diminta melewati jumlah data yang ada
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Jumlah berita terbaru untuk halaman Beranda
const LATEST_LIMIT = 3;

// Kolom yang diambil. TIDAK memakai select("*"). Join ke admins hanya name, sehingga
// id, email, dan password_hash admin tidak pernah ikut keluar. Daftar tidak memuat
// content_html agar hemat bandwidth.
const PUBLIC_LIST_COLUMNS = "id, title, slug, excerpt, cover_image_path, published_at, author:admins(name)";
const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_LIST_COLUMNS}, content_html, updated_at`;

// Row database (snake_case) -> response publik (camelCase).
// Sengaja TIDAK mengeluarkan status, coverImagePath, createdAt, maupun id admin.
const serializePublicNews = (row) => {
  const news = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImageUrl: getCoverPublicUrl(row.cover_image_path),
    publishedAt: row.published_at,
    author: row.author ? { name: row.author.name } : null,
  };
  if (row.content_html !== undefined) news.contentHtml = row.content_html;
  if (row.updated_at !== undefined) news.updatedAt = row.updated_at;
  return news;
};

// SATU-SATUNYA pintu filter publik: dipakai oleh semua endpoint (daftar, terbaru, detail,
// dan penghitungan total), sehingga draft tidak mungkin lolos lewat salah satunya.
const onlyPublished = (query) =>
  query.eq("status", "published").lte("published_at", new Date().toISOString());

const newsNotFound = () => new AppError("Berita tidak ditemukan", 404, "NEWS_NOT_FOUND");

// ---------------------------------------------------------------------
// GET /api/news/latest
// ---------------------------------------------------------------------
const listLatestNews = async (req, res) => {
  const { data, error } = await onlyPublished(
    supabase.from("news").select(PUBLIC_LIST_COLUMNS)
  )
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LATEST_LIMIT);

  if (error) throwDbError("public news: terbaru", error);

  return res.json({
    success: true,
    data: { items: data.map(serializePublicNews) },
  });
};

// ---------------------------------------------------------------------
// GET /api/news
// ---------------------------------------------------------------------
const listPublicNews = async (req, res) => {
  const { page, limit, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const term = search ? cleanSearchTerm(search) : "";

  const applyFilters = (query) => {
    let filtered = onlyPublished(query);
    if (term) filtered = filtered.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from("news").select(PUBLIC_LIST_COLUMNS, { count: "exact" })
  )
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  // Halaman di luar jumlah data bukan kesalahan: kembalikan daftar kosong,
  // dan hitung total lewat query terpisah (dengan filter yang sama).
  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("news").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("public news: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("public news: daftar", error);

  const total = count ?? 0;

  return res.json({
    success: true,
    data: {
      items: data.map(serializePublicNews),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/news/:slug
// ---------------------------------------------------------------------
// Draft, berita yang sudah di-unpublish, dan slug yang tidak ada semuanya menghasilkan
// 404 yang sama, sehingga pengunjung tidak bisa menebak keberadaan draft.
const getPublicNews = async (req, res) => {
  const { slug } = req.validated.params;

  const { data, error } = await onlyPublished(
    supabase.from("news").select(PUBLIC_DETAIL_COLUMNS).eq("slug", slug)
  ).maybeSingle();

  if (error) throwDbError("public news: detail", error);
  if (!data) throw newsNotFound();

  return res.json({ success: true, data: { news: serializePublicNews(data) } });
};

module.exports = {
  listLatestNews,
  listPublicNews,
  getPublicNews,
  serializePublicNews,
};
