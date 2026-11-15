-- Kategori berita & pengumuman. JALANKAN DI SUPABASE (SQL Editor) SEBELUM men-deploy backend ini,
-- karena backend sekarang membaca kolom `category`.
-- Aman dijalankan berulang (IF NOT EXISTS). Data lama tetap utuh: category = NULL.
-- Nilai kategori divalidasi di aplikasi (src/utils/contentCategories.js), bukan constraint DB,
-- agar daftar kategori bisa ditambah tanpa migrasi.

ALTER TABLE public.news          ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS news_category_idx          ON public.news (category);
CREATE INDEX IF NOT EXISTS announcements_category_idx ON public.announcements (category);
