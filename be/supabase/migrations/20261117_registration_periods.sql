-- Periode Pendaftaran PMB (FE /pmb/periode-pendaftaran).
-- 1. registration_period_settings: Teks pengantar hero dan heading tahapan pendaftaran.
-- 2. registration_waves: Daftar gelombang pendaftaran (CRUD) beserta tahapan kegiatan.

CREATE TABLE IF NOT EXISTS public.registration_period_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'PENERIMAAN MAHASISWA BARU',
  hero_title text NOT NULL DEFAULT 'Periode Pendaftaran',
  hero_description text NOT NULL DEFAULT 'Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA. Pilih gelombang untuk melihat jadwal pendaftaran, tes, dan daftar ulang.',
  section_eyebrow text NOT NULL DEFAULT 'JADWAL PENERIMAAN 2027',
  section_title text NOT NULL DEFAULT 'Tahapan pendaftaran',
  section_description text NOT NULL DEFAULT 'Jadwal di bawah merupakan data contoh dan dapat diperbarui.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.registration_period_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.registration_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  label text CHECK (label IS NULL OR char_length(label) <= 150),
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registration_waves_public_idx
  ON public.registration_waves (status, sort_order, created_at);

-- Seed awal sesuai 3 gelombang pendaftaran bawaan di FE
INSERT INTO public.registration_waves (name, label, activities, sort_order, status)
VALUES
  (
    'Gelombang 1',
    'Pendaftaran awal',
    '[
      {"name": "Pendaftaran", "time": "01 Januari – 31 Maret 2027"},
      {"name": "Tes dan Wawancara", "time": "05 April 2027"},
      {"name": "Daftar Ulang", "time": "10 April – 20 April 2027"}
    ]'::jsonb,
    1,
    'published'
  ),
  (
    'Gelombang 2',
    'Pendaftaran lanjutan',
    '[
      {"name": "Pendaftaran", "time": "01 April – 30 Juni 2027"},
      {"name": "Tes dan Wawancara", "time": "05 Juli 2027"},
      {"name": "Daftar Ulang", "time": "10 Juli – 20 Juli 2027"}
    ]'::jsonb,
    2,
    'published'
  ),
  (
    'Gelombang 3',
    'Pendaftaran akhir',
    '[
      {"name": "Pendaftaran", "time": "01 Juli – 30 September 2027"},
      {"name": "Tes dan Wawancara", "time": "05 Oktober 2027"},
      {"name": "Daftar Ulang", "time": "10 Oktober – 20 Oktober 2027"}
    ]'::jsonb,
    3,
    'published'
  )
ON CONFLICT DO NOTHING;

