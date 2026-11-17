-- Fasilitas Kampus (FE /profil/fasilitas-kampus).
-- 1. campus_facilities: Daftar fasilitas kampus (CRUD) beserta foto pendukung.
-- 2. campus_facility_settings: Teks pengantar hero & galeri pada halaman fasilitas kampus.

CREATE TABLE IF NOT EXISTS public.campus_facility_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_title text NOT NULL DEFAULT 'Fasilitas Kampus',
  hero_subtitle text NOT NULL DEFAULT 'Kenali fasilitas kampus yang mendukung kegiatan belajar, kolaborasi, dan kehidupan mahasiswa.',
  hero_image_path text,
  gallery_eyebrow text NOT NULL DEFAULT 'FASILITAS PENDUKUNG',
  gallery_title text NOT NULL DEFAULT 'Ruang untuk Belajar dan Berkembang',
  gallery_description text NOT NULL DEFAULT 'Galeri fasilitas kampus akan dilengkapi foto dan deskripsi resmi setelah aset tersedia.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.campus_facility_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.campus_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 2 AND 1000),
  image_path text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campus_facilities_public_idx
  ON public.campus_facilities (status, sort_order, created_at);

-- Seed awal sesuai 6 item bawaan pada FE fasilitas kampus
INSERT INTO public.campus_facilities (title, description, sort_order, status)
VALUES
  ('Perpustakaan', 'Foto dan deskripsi fasilitas akan ditambahkan.', 1, 'published'),
  ('Ruang Kelas', 'Foto dan deskripsi fasilitas akan ditambahkan.', 2, 'published'),
  ('Laboratorium', 'Foto dan deskripsi fasilitas akan ditambahkan.', 3, 'published'),
  ('Area Kampus', 'Foto dan deskripsi fasilitas akan ditambahkan.', 4, 'published'),
  ('Ruang Kegiatan', 'Foto dan deskripsi fasilitas akan ditambahkan.', 5, 'published'),
  ('Fasilitas Pendukung', 'Foto dan deskripsi fasilitas akan ditambahkan.', 6, 'published')
ON CONFLICT DO NOTHING;

