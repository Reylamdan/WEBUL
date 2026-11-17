-- Struktur Organisasi (profil). Satu tabel untuk dua bagian halaman publik:
--   category = 'bagan' -> gambar bagan organisasi (+ deskripsi)
--   category = 'unit'  -> kartu unit / pimpinan (gambar opsional)
-- Gambar opsional; path objek di bucket Storage "news-images" (prefix "organization/<id>/").
CREATE TABLE IF NOT EXISTS public.organization_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  position text CHECK (position IS NULL OR char_length(position) <= 150),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  category text NOT NULL CHECK (category IN ('bagan', 'unit')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_units_public_idx
  ON public.organization_units (status, category, sort_order, created_at);
