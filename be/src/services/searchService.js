// Global Search: mencari ke beberapa sumber konten PUBLIK sekaligus dan menyeragamkan hasilnya.
//
// Prinsip keamanan:
//   - Setiap sumber memakai filter "published" yang SAMA dengan endpoint publik modul itu
//     (berita/pengumuman/akreditasi/regulasi: status=published DAN published_at <= sekarang;
//     kalender akademik: status=published). Draft / terjadwal tidak pernah ikut.
//   - Hanya kolom yang dibutuhkan yang di-select (tanpa select("*")). Tidak ada id admin,
//     status, path/ID file Drive atau Storage, maupun isi artikel (content_html).
//   - Pencarian hanya pada kolom teks ringkas (judul, excerpt, dst), sama seperti pencarian
//     di modul masing-masing.
const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");

const EXCERPT_MAX = 200;

// Path halaman di FRONTEND (relatif). Dipusatkan di sini supaya mudah disesuaikan dengan route
// Next.js tanpa menyentuh logika pencarian. Berita & pengumuman memakai slug; modul lain belum
// punya halaman detail sendiri, jadi diarahkan ke halaman daftarnya.
const FRONTEND_PATHS = {
  news: (row) => `/berita/${row.slug}`,
  announcement: (row) => `/pengumuman/${row.slug}`,
  academic_calendar: () => "/kalender-akademik",
  accreditation_institution: () => "/akreditasi",
  accreditation_study_program: () => "/akreditasi",
  banpt_regulation: () => "/regulasi-banpt",
};

const truncate = (value, max = EXCERPT_MAX) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join("").replace(/[\s.,;:!?-]+$/u, "")}…`;
};

const joinParts = (parts) => parts.filter((p) => p !== null && p !== undefined && p !== "").join(" · ");

// Filter published yang sama dengan jalur publik masing-masing modul.
const publishedWithDate = (query) =>
  query.eq("status", "published").lte("published_at", new Date().toISOString());
const publishedOnly = (query) => query.eq("status", "published");

const ilikeAny = (columns, term) => columns.map((c) => `${c}.ilike.%${term}%`).join(",");

// Definisi sumber. Tiap sumber: tabel, kolom yang diambil, kolom yang dicari, filter published,
// urutan di database, dan fungsi pemetaan ke bentuk hasil seragam.
const SOURCES = [
  {
    type: "news",
    table: "news",
    columns: "id, title, slug, excerpt, published_at",
    searchFilter: (term) => ilikeAny(["title", "excerpt"], term),
    published: publishedWithDate,
    order: (q) => q.order("published_at", { ascending: false }).order("id", { ascending: false }),
    map: (row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: truncate(row.excerpt),
      date: row.published_at,
    }),
  },
  {
    type: "announcement",
    table: "announcements",
    columns: "id, title, slug, excerpt, published_at",
    searchFilter: (term) => ilikeAny(["title", "excerpt"], term),
    published: publishedWithDate,
    order: (q) => q.order("published_at", { ascending: false }).order("id", { ascending: false }),
    map: (row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: truncate(row.excerpt),
      date: row.published_at,
    }),
  },
  {
    type: "academic_calendar",
    table: "academic_calendar_events",
    columns: "id, title, description, start_date, end_date",
    searchFilter: (term) => ilikeAny(["title", "description"], term),
    published: publishedOnly,
    order: (q) => q.order("start_date", { ascending: false }).order("id", { ascending: false }),
    map: (row) => ({
      id: row.id,
      title: row.title,
      slug: null,
      excerpt: truncate(row.description) || joinParts([row.start_date, row.end_date && row.end_date !== row.start_date ? `s.d. ${row.end_date}` : null]),
      date: row.start_date,
    }),
  },
  {
    type: "accreditation_institution",
    table: "accreditation_institutions",
    columns: "id, institution_name, rank, sk_number, published_at",
    searchFilter: (term) => ilikeAny(["institution_name", "sk_number", "rank"], term),
    published: publishedWithDate,
    order: (q) => q.order("published_at", { ascending: false }).order("id", { ascending: false }),
    map: (row) => ({
      id: row.id,
      title: row.institution_name,
      slug: null,
      excerpt: truncate(joinParts([row.rank ? `Peringkat ${row.rank}` : null, row.sk_number ? `SK ${row.sk_number}` : null])),
      date: row.published_at,
    }),
  },
  {
    type: "accreditation_study_program",
    table: "accreditation_study_programs",
    columns: "id, program_name, education_level, faculty, rank, sk_number, published_at",
    searchFilter: (term) => ilikeAny(["program_name", "faculty", "sk_number", "rank"], term),
    published: publishedWithDate,
    order: (q) => q.order("published_at", { ascending: false }).order("id", { ascending: false }),
    map: (row) => ({
      id: row.id,
      title: row.education_level ? `${row.program_name} (${row.education_level})` : row.program_name,
      slug: null,
      excerpt: truncate(joinParts([row.faculty, row.rank ? `Peringkat ${row.rank}` : null, row.sk_number ? `SK ${row.sk_number}` : null])),
      date: row.published_at,
    }),
  },
  {
    type: "banpt_regulation",
    table: "banpt_regulations",
    columns: "id, regulation_number, regulation_year, title, determination_date, published_at",
    // Kolom tahun bertipe angka: dicocokkan persis hanya jika kata kunci berupa 4 digit
    // (sama seperti pencarian di modul regulasi).
    searchFilter: (term) => {
      const parts = [`regulation_number.ilike.%${term}%`, `title.ilike.%${term}%`];
      if (/^\d{4}$/.test(term)) parts.push(`regulation_year.eq.${term}`);
      return parts.join(",");
    },
    published: publishedWithDate,
    order: (q) => q.order("determination_date", { ascending: false, nullsFirst: false }).order("id", { ascending: true }),
    map: (row) => ({
      id: row.id,
      title: row.title,
      slug: null,
      excerpt: truncate(joinParts([row.regulation_number ? `Nomor ${row.regulation_number}` : null, row.regulation_year ? `Tahun ${row.regulation_year}` : null])),
      date: row.determination_date || row.published_at,
    }),
  },
];

// Mengambil hasil satu sumber. Error TIDAK dilempar: dikembalikan sebagai { failed, error }
// supaya satu tabel yang bermasalah tidak mematikan seluruh pencarian.
const querySource = async (source, term, limit) => {
  try {
    const base = supabase.from(source.table).select(source.columns, { count: "exact" });
    const filtered = source.published(base).or(source.searchFilter(term));
    const { data, count, error } = await source.order(filtered).limit(limit);
    if (error) return { source, failed: true, error };
    return { source, failed: false, rows: data || [], count: count ?? (data || []).length };
  } catch (error) {
    return { source, failed: true, error };
  }
};

const toTime = (value) => {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
};

// Judul yang memuat kata kunci diutamakan, lalu yang terbaru.
const rank = (items, term) => {
  const needle = term.toLowerCase();
  return items.sort((a, b) => {
    const sa = String(a.title).toLowerCase().includes(needle) ? 0 : 1;
    const sb = String(b.title).toLowerCase().includes(needle) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return toTime(b.date) - toTime(a.date);
  });
};

// term HARUS sudah dibersihkan (lihat searchValidator). limit sudah divalidasi (1..20).
const searchPublicContent = async (term, { limit }) => {
  const outcomes = await Promise.all(SOURCES.map((source) => querySource(source, term, limit)));

  const failures = outcomes.filter((o) => o.failed);
  for (const f of failures) {
    console.error(
      `[DB] global search ${f.source.table}: ${(f.error && f.error.message) || f.error} (kode: ${(f.error && f.error.code) || "-"})`
    );
  }
  // Semua sumber gagal: itu error server sungguhan (pesan ke klien tetap umum).
  if (failures.length === outcomes.length) {
    throwDbError("global search: semua sumber gagal", failures[0].error);
  }

  const all = [];
  let total = 0;
  for (const outcome of outcomes) {
    if (outcome.failed) continue;
    total += outcome.count;
    for (const row of outcome.rows) {
      const item = outcome.source.map(row);
      all.push({
        type: outcome.source.type,
        id: item.id,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        url: FRONTEND_PATHS[outcome.source.type](row),
        date: item.date ?? null,
      });
    }
  }

  const results = rank(all, term).slice(0, limit);

  const data = { query: term, total, limit, results };
  // Hanya muncul jika ada sumber yang gagal: hasil dari sumber lain tetap dikirim.
  if (failures.length > 0) data.partial = true;
  return data;
};

module.exports = { searchPublicContent, SOURCES, FRONTEND_PATHS };
