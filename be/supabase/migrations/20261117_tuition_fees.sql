-- Biaya Kuliah PMB (FE /pmb/biaya-kuliah).
-- 1. tuition_settings: Teks pengantar hero, heading rincian biaya, dan daftar program studi standar.
-- 2. tuition_waves: Daftar gelombang biaya kuliah (CRUD) beserta rincian UKT per program studi.

CREATE TABLE IF NOT EXISTS public.tuition_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'PENERIMAAN MAHASISWA BARU',
  hero_title text NOT NULL DEFAULT 'Biaya Kuliah',
  hero_description text NOT NULL DEFAULT 'Temukan informasi biaya kuliah Universitas LIA berdasarkan program studi dan gelombang pendaftaran. Pilih gelombang untuk melihat rincian biaya pendidikan.',
  section_eyebrow text NOT NULL DEFAULT 'RINCIAN BIAYA',
  section_title text NOT NULL DEFAULT 'UKT setiap Gelombang',
  study_programs jsonb NOT NULL DEFAULT '[
    "Bahasa Jepang",
    "Bahasa Inggris",
    "Desain Komunikasi Visual",
    "Sistem Informasi",
    "Informatika",
    "Bisnis Digital",
    "D3 Bahasa Inggris"
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tuition_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tuition_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  period text NOT NULL CHECK (char_length(period) BETWEEN 2 AND 150),
  fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tuition_waves_public_idx
  ON public.tuition_waves (status, sort_order, created_at);

-- Seed awal sesuai 3 gelombang biaya kuliah bawaan di FE
INSERT INTO public.tuition_waves (name, period, fees, sort_order, status)
VALUES
  (
    'Gelombang 1',
    '01 Januari – 31 Maret 2026',
    '[
      {"program": "Bahasa Jepang", "amount": 5250000},
      {"program": "Bahasa Inggris", "amount": 5250000},
      {"program": "Desain Komunikasi Visual", "amount": 5000000},
      {"program": "Sistem Informasi", "amount": 5000000},
      {"program": "Informatika", "amount": 5000000},
      {"program": "Bisnis Digital", "amount": 5000000},
      {"program": "D3 Bahasa Inggris", "amount": 4500000}
    ]'::jsonb,
    1,
    'published'
  ),
  (
    'Gelombang 2',
    '01 April – 30 Juni 2026',
    '[
      {"program": "Bahasa Jepang", "amount": 6000000},
      {"program": "Bahasa Inggris", "amount": 6000000},
      {"program": "Desain Komunikasi Visual", "amount": 5250000},
      {"program": "Sistem Informasi", "amount": 5250000},
      {"program": "Informatika", "amount": 5250000},
      {"program": "Bisnis Digital", "amount": 5250000},
      {"program": "D3 Bahasa Inggris", "amount": 4500000}
    ]'::jsonb,
    2,
    'published'
  ),
  (
    'Gelombang 3',
    '01 Juli – 30 September 2026',
    '[
      {"program": "Bahasa Jepang", "amount": 6750000},
      {"program": "Bahasa Inggris", "amount": 6750000},
      {"program": "Desain Komunikasi Visual", "amount": 5250000},
      {"program": "Sistem Informasi", "amount": 5250000},
      {"program": "Informatika", "amount": 5250000},
      {"program": "Bisnis Digital", "amount": 5250000},
      {"program": "D3 Bahasa Inggris", "amount": 5000000}
    ]'::jsonb,
    3,
    'published'
  )
ON CONFLICT DO NOTHING;

