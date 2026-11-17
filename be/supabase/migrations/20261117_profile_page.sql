-- Halaman Profil (FE /profil).
-- Dua tabel:
-- 1. profile_page_settings: Menyimpan teks & gambar hero, tentang kami (mengenal), dan pengantar jelajahi.
-- 2. profile_cards: Menyimpan daftar kartu jelajahi profil (CRUD).

CREATE TABLE IF NOT EXISTS public.profile_page_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_title text NOT NULL DEFAULT 'Profil Universitas LIA',
  hero_subtitle text NOT NULL DEFAULT 'Mengenal Universitas LIA, perjalanan institusi, nilai, dan lingkungan akademik yang mendukung pengembangan kompetensi.',
  hero_image_path text,
  about_eyebrow text NOT NULL DEFAULT 'TENTANG KAMI',
  about_title text NOT NULL DEFAULT 'Mengenal Universitas LIA',
  about_lead text NOT NULL DEFAULT 'Informasi ringkas mengenai identitas, perjalanan, dan komitmen Universitas LIA.',
  about_body text NOT NULL DEFAULT 'Universitas LIA berkomitmen menghadirkan pengalaman pendidikan yang relevan, kolaboratif, dan berorientasi pada pengembangan kompetensi. Bagian ini dapat dilengkapi dengan profil resmi, nilai institusi, serta informasi utama universitas.',
  about_image_path text,
  explore_eyebrow text NOT NULL DEFAULT 'JELAJAHI PROFIL',
  explore_title text NOT NULL DEFAULT 'Informasi Universitas LIA',
  explore_description text NOT NULL DEFAULT 'Pilih bagian profil untuk melihat informasi lebih lanjut.',
  bottom_note text NOT NULL DEFAULT 'Konten dan foto pendukung dapat ditambahkan setelah materi resmi tersedia.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed row default
INSERT INTO public.profile_page_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profile_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 2 AND 500),
  href text NOT NULL CHECK (char_length(href) BETWEEN 1 AND 255),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_cards_public_idx
  ON public.profile_cards (status, sort_order, created_at);

-- Seed kartu awal sesuai dengan halaman FE profil bawaan
INSERT INTO public.profile_cards (title, description, href, sort_order, status)
VALUES
  ('Sejarah', 'Perjalanan dan perkembangan institusi.', '/profil/sejarah', 1, 'published'),
  ('Visi & Misi', 'Arah dan komitmen universitas.', '/profil/visi-misi', 2, 'published'),
  ('Struktur Organisasi', 'Susunan organisasi dan tata kelola.', '/profil/struktur-organisasi', 3, 'published'),
  ('Akreditasi', 'Informasi akreditasi institusi dan program studi.', '/profil/akreditasi', 4, 'published'),
  ('Fasilitas Kampus', 'Ruang dan fasilitas pendukung kegiatan kampus.', '/profil/fasilitas-kampus', 5, 'published'),
  ('Unit dan Bagian', 'Unit pelaksana teknis dan bagian tata kelola universitas.', '/profil/unit-dan-bagian', 6, 'published')
ON CONFLICT DO NOTHING;

