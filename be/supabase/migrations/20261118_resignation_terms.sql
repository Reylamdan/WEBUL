-- Syarat dan Ketentuan Pengunduran Diri (FE /pengunduran-diri).
-- 1. resignation_settings: Teks pengantar hero dan heading syarat & ketentuan.
-- 2. resignation_terms: Butir-butir syarat & ketentuan pengunduran diri (CRUD).

CREATE TABLE IF NOT EXISTS public.resignation_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'INFORMASI PENTING',
  hero_title text NOT NULL DEFAULT 'Pengunduran Diri',
  hero_description text,
  section_title text NOT NULL DEFAULT 'Syarat dan Ketentuan',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.resignation_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Butir Syarat dan Ketentuan
CREATE TABLE IF NOT EXISTS public.resignation_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text NOT NULL CHECK (char_length(description) >= 5),
  refund_percentage integer CHECK (refund_percentage IS NULL OR (refund_percentage BETWEEN 0 AND 100)),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resignation_terms_idx ON public.resignation_terms (status, sort_order, created_at);

-- Seed awal sesuai 3 butir di halaman FE
INSERT INTO public.resignation_terms (title, description, refund_percentage, sort_order, status)
VALUES
  (
    'Diterima di PTN',
    'Mahasiswa yang mengundurkan diri karena diterima PTN wajib menyertakan surat keterangan dari kampus yang bersangkutan, dan biaya yang sudah dibayarkan akan dikembalikan 80%.',
    80,
    1,
    'published'
  ),
  (
    'Sakit Keras / Perawatan Medis',
    'Mahasiswa yang mengundurkan diri karena sakit keras dan perlu dirawat wajib menyertakan surat keterangan dari dokter, dan biaya yang sudah dibayarkan akan dikembalikan 80% jika waktu pengunduran diri sebelum kegiatan perkuliahan dimulai.',
    80,
    2,
    'published'
  ),
  (
    'Alasan Lainnya',
    'Mahasiswa yang mengundurkan diri di luar poin 1 dan 2, maka biaya yang sudah dibayarkan tidak dapat dikembalikan.',
    0,
    3,
    'published'
  )
ON CONFLICT DO NOTHING;

