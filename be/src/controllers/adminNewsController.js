const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { makeExcerpt } = require("../utils/excerpt");
const { slugify, withSuffix } = require("../utils/slug");

// Kode error Postgres
const UNIQUE_VIOLATION = "23505";
// Kode error PostgREST: halaman diminta melewati jumlah data yang ada
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Kolom yang diambil. TIDAK memakai select("*"), dan join ke admins hanya id + name,
// sehingga password_hash, email, dan data sensitif admin tidak pernah ikut keluar.
const LIST_COLUMNS =
  "id, title, slug, excerpt, cover_image_path, status, published_at, created_at, updated_at, author:admins(id, name)";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, content_html`;

const MAX_SLUG_ATTEMPTS = 5;
const SLUG_NUMBERED_CANDIDATES = 20; // base, base-2, ... base-21

// Row database (snake_case) -> response API (camelCase)
const serializeNews = (row) => {
  const news = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImagePath: row.cover_image_path,
    status: row.status,
    publishedAt: row.published_at,
    author: row.author ? { id: row.author.id, name: row.author.name } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.content_html !== undefined) news.contentHtml = row.content_html;
  return news;
};

// Kata kunci pencarian dimasukkan ke filter .or() PostgREST. Karakter yang berarti khusus di sana
// (koma, kurung, kutip, backslash) dan karakter wildcard (% _ *) diganti spasi supaya input
// pengguna tidak bisa menyisipkan filter lain atau memaksa pola LIKE yang berat.
const cleanSearchTerm = (term) =>
  term
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Memilih slug yang belum dipakai. Satu query untuk memeriksa beberapa kandidat sekaligus.
// Ini hanya OPTIMASI untuk menghindari bentrok; yang menjamin keunikan sesungguhnya adalah
// constraint news_slug_key di database (lihat createNews: error 23505 -> coba lagi).
// Mulai percobaan ke-3 dipakai sufiks acak agar tidak terus berebut slug yang sama.
const pickAvailableSlug = async (baseSlug, attempt) => {
  if (attempt >= 2) {
    return withSuffix(baseSlug, crypto.randomBytes(3).toString("hex"));
  }

  const candidates = [baseSlug];
  for (let n = 2; n < 2 + SLUG_NUMBERED_CANDIDATES; n += 1) {
    candidates.push(withSuffix(baseSlug, String(n)));
  }

  const { data, error } = await supabase.from("news").select("slug").in("slug", candidates);
  if (error) throwDbError("news: cek slug", error);

  const taken = new Set(data.map((row) => row.slug));
  return candidates.find((candidate) => !taken.has(candidate)) ?? withSuffix(baseSlug, crypto.randomBytes(3).toString("hex"));
};

// Mengambil satu berita lengkap (atau null jika tidak ada)
const findNewsById = async (id, context) => {
  const { data, error } = await supabase.from("news").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const newsNotFound = () => new AppError("Berita tidak ditemukan", 404, "NEWS_NOT_FOUND");

// ---------------------------------------------------------------------
// GET /api/admin/news
// ---------------------------------------------------------------------
const listNews = async (req, res) => {
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
    supabase.from("news").select(LIST_COLUMNS, { count: "exact" })
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  // Halaman di luar jumlah data (misalnya page=99 saat hanya ada 3 berita) bukan kesalahan:
  // kembalikan daftar kosong, dan hitung total lewat query terpisah.
  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(
      supabase.from("news").select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError("news: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("news: daftar", error);

  const total = count ?? 0;

  return res.json({
    success: true,
    data: {
      items: data.map(serializeNews),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/news/:id
// ---------------------------------------------------------------------
const getNews = async (req, res) => {
  const news = await findNewsById(req.validated.params.id, "news: detail");
  if (!news) throw newsNotFound();

  return res.json({ success: true, data: { news: serializeNews(news) } });
};

// ---------------------------------------------------------------------
// POST /api/admin/news
// ---------------------------------------------------------------------
const createNews = async (req, res) => {
  const { title, contentHtml, excerpt, status = "draft" } = req.body;

  // excerpt tidak dikirim / kosong -> dibuat otomatis dari isi berita
  const finalExcerpt = excerpt || makeExcerpt(contentHtml);
  if (!finalExcerpt) {
    throw new AppError("Isi berita tidak memiliki konten yang layak", 400, "VALIDATION_ERROR");
  }

  const baseSlug = slugify(title);
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = await pickAvailableSlug(baseSlug, attempt);

    const { data, error } = await supabase
      .from("news")
      .insert({
        title,
        slug,
        excerpt: finalExcerpt,
        content_html: contentHtml,
        status,
        published_at: publishedAt,
        author_id: req.admin.id, // dari token yang sudah diverifikasi, BUKAN dari body
      })
      .select(DETAIL_COLUMNS)
      .single();

    // Slug direbut request lain di antara pengecekan dan insert -> ulangi dengan slug lain
    if (error && error.code === UNIQUE_VIOLATION) continue;
    if (error) throwDbError("news: buat", error);

    return res.status(201).json({
      success: true,
      message: "Berita berhasil dibuat",
      data: { news: serializeNews(data) },
    });
  }

  throw new AppError(
    "Gagal membuat slug yang unik, silakan coba lagi",
    409,
    "SLUG_CONFLICT"
  );
};

// ---------------------------------------------------------------------
// PATCH /api/admin/news/:id
// ---------------------------------------------------------------------
const updateNews = async (req, res) => {
  const { id } = req.validated.params;
  const body = req.body;

  const current = await findNewsById(id, "news: ambil untuk update");
  if (!current) throw newsNotFound();

  // Hanya field yang dikirim yang diubah.
  // author_id, created_at, dan cover_image_path tidak pernah diubah di sini.
  const patch = {};

  if (body.title !== undefined) patch.title = body.title;
  if (body.contentHtml !== undefined) patch.content_html = body.contentHtml;

  // Slug TIDAK berubah otomatis saat judul diedit. Hanya berubah jika slug dikirim eksplisit.
  if (body.slug !== undefined && body.slug !== current.slug) patch.slug = body.slug;

  // excerpt: tidak dikirim -> dipertahankan. Dikirim kosong -> dibuat ulang dari isi berita
  // (isi yang baru jika ikut dikirim, jika tidak isi yang tersimpan).
  if (body.excerpt !== undefined) {
    const excerpt = body.excerpt || makeExcerpt(body.contentHtml ?? current.content_html);
    if (!excerpt) {
      throw new AppError("Isi berita tidak memiliki konten yang layak", 400, "VALIDATION_ERROR");
    }
    patch.excerpt = excerpt;
  }

  // published_at: diisi HANYA saat pertama kali dipublikasikan. Setelah itu dipertahankan,
  // termasuk ketika berita dikembalikan ke draft atau diterbitkan ulang.
  if (body.status !== undefined) {
    patch.status = body.status;
    if (body.status === "published" && !current.published_at) {
      patch.published_at = new Date().toISOString();
    }
  }

  // Tidak ada yang benar-benar berubah (misalnya slug dikirim sama dengan yang sekarang)
  if (Object.keys(patch).length === 0) {
    return res.json({
      success: true,
      message: "Tidak ada perubahan",
      data: { news: serializeNews(current) },
    });
  }

  const { data, error } = await supabase
    .from("news")
    .update(patch)
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error && error.code === UNIQUE_VIOLATION) {
    throw new AppError("Slug sudah dipakai berita lain", 409, "SLUG_TAKEN");
  }
  if (error) throwDbError("news: perbarui", error);

  // Berita dihapus oleh request lain di antara pembacaan dan pembaruan
  if (!data) throw newsNotFound();

  return res.json({
    success: true,
    message: "Berita berhasil diperbarui",
    data: { news: serializeNews(data) },
  });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/news/:id
// ---------------------------------------------------------------------
// Hanya menghapus SATU baris di tabel news. Terjemahan milik berita ini di content_translations
// dibersihkan oleh trigger database news_delete_translations (Fase 2A), yang hanya menyentuh
// entity_type = 'news' dan entity_id = id berita ini. Kode ini sengaja tidak menyentuh
// content_translations, sehingga cache modul lain tidak mungkin ikut terhapus.
const deleteNews = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase.from("news").delete().eq("id", id).select("id");
  if (error) throwDbError("news: hapus", error);

  if (!data || data.length === 0) throw newsNotFound();

  return res.json({ success: true, message: "Berita berhasil dihapus" });
};

module.exports = { listNews, getNews, createNews, updateNews, deleteNews };
