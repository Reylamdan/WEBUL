-- Beranda (homepage) - FE "/" dan admin "/admin/beranda".
--  * homepage_settings : satu baris (id = 'main'), isi teks/tautan semua section beranda dalam JSONB
--                        (hero, tentang, program, kehidupan kampus, banner PMB, quick links, mitra).
--                        Section yang belum disimpan memakai teks bawaan di service.
--  * homepage_photos   : CRUD foto (hero, tentang, kehidupan kampus). File di bucket "news-images"
--                        dengan prefix "homepage/".
--  * homepage_videos   : CRUD video. File video disimpan di Cloudinary lewat modul /api/admin/videos
--                        dengan owner_module = 'homepage-videos' dan record_id = homepage_videos.id.
-- Berita, pengumuman, dan agenda di beranda sudah punya API sendiri dan TIDAK dikelola di sini.

CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homepage_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('hero', 'about', 'campus_life')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 300),
  image_path text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homepage_photos_placement_idx
  ON public.homepage_photos (placement, status, sort_order);

CREATE TABLE IF NOT EXISTS public.homepage_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homepage_videos_status_idx
  ON public.homepage_videos (status, sort_order);

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_videos ENABLE ROW LEVEL SECURITY;
