-- Kurikulum Akademik (FE /akademik/kurikulum).
-- 1. curriculum_settings: Teks pengantar hero, konsep OBE, dan intro tabel.
-- 2. curriculum_programs: Daftar komponen kurikulum per program studi (CRUD).

CREATE TABLE IF NOT EXISTS public.curriculum_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'AKADEMIK UNIVERSITAS LIA',
  hero_title text NOT NULL DEFAULT 'Kurikulum',
  hero_description text NOT NULL DEFAULT 'Informasi tentang pendekatan, struktur, dan arah pembelajaran di Universitas LIA. Rincian kurikulum mengikuti program studi dan dokumen akademik resmi.',
  obe_title text NOT NULL DEFAULT 'Outcome-Based Education (OBE)',
  obe_lead text NOT NULL DEFAULT 'Capaian pembelajaran sebagai arah perancangan mata kuliah.',
  obe_description text NOT NULL DEFAULT 'Kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang dibutuhkan lulusan.',
  table_eyebrow text NOT NULL DEFAULT 'STRUKTUR KURIKULUM',
  table_title text NOT NULL DEFAULT 'Komponen pembelajaran program studi',
  table_intro text NOT NULL DEFAULT 'Gambaran umum fokus pembelajaran setiap program studi. Untuk rincian mata kuliah, rujuk dokumen kurikulum resmi program studi.',
  table_note text NOT NULL DEFAULT 'Catatan: rincian mata kuliah dapat berbeda menurut program studi dan periode kurikulum.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.curriculum_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.curriculum_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  href text NOT NULL CHECK (char_length(href) BETWEEN 1 AND 255),
  focus text NOT NULL CHECK (char_length(focus) BETWEEN 2 AND 500),
  components text NOT NULL CHECK (char_length(components) BETWEEN 2 AND 500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curriculum_programs_public_idx
  ON public.curriculum_programs (status, sort_order, created_at);

-- Seed awal sesuai 7 program studi bawaan di FE kurikulum
INSERT INTO public.curriculum_programs (name, href, focus, components, sort_order, status)
VALUES
  ('D3 Bahasa Inggris', '/akademik/programstudi/humanioradesain/d3-bing', 'Bahasa, komunikasi, dan kajian linguistik', 'Mata kuliah inti dan pilihan', 1, 'published'),
  ('S1 Bahasa Inggris', '/akademik/programstudi/humanioradesain/s1-bing', 'Bahasa Inggris, sastra, dan komunikasi', 'Mata kuliah inti dan pilihan', 2, 'published'),
  ('S1 Bahasa Jepang', '/akademik/programstudi/humanioradesain/s1-bjepang', 'Bahasa Jepang, budaya, dan penerjemahan', 'Mata kuliah inti dan pilihan', 3, 'published'),
  ('S1 Desain Komunikasi Visual', '/akademik/programstudi/humanioradesain/s1-dkv', 'Desain, komunikasi visual, dan praktik kreatif', 'Mata kuliah inti dan pilihan', 4, 'published'),
  ('S1 Bisnis Digital', '/akademik/programstudi/sainsdanbisnis/s1-bisnis-digital', 'Bisnis, manajemen, dan teknologi digital', 'Mata kuliah inti dan pilihan', 5, 'published'),
  ('S1 Sistem Informasi', '/akademik/programstudi/sainsdanbisnis/s1-sistem-informasi', 'Sistem informasi dan transformasi digital', 'Mata kuliah inti dan pilihan', 6, 'published'),
  ('S1 Informatika', '/akademik/programstudi/sainsdanbisnis/s1-informatika', 'Komputasi, pemrograman, dan pengembangan teknologi', 'Mata kuliah inti dan pilihan', 7, 'published')
ON CONFLICT DO NOTHING;

