-- Laporan Tahunan Rektor - FE /laporan-tahunan-rektor dan /admin/laporan-tahunan-rektor.
-- 1. rector_report_settings: Teks hero, deskripsi, judul arsip, dan email kontak permintaan laporan.
-- 2. rector_reports: Data Laporan Tahunan Rektor (CRUD).

CREATE TABLE IF NOT EXISTS public.rector_report_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_title text NOT NULL DEFAULT 'Laporan Tahunan Rektor Universitas LIA',
  hero_description text NOT NULL DEFAULT 'Akses dokumen laporan tahunan rektor yang dipublikasikan oleh Universitas LIA.',
  archive_title text NOT NULL DEFAULT 'Arsip laporan',
  contact_email text NOT NULL DEFAULT 'humas@universitaslia.ac.id',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.rector_report_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Butir Laporan Tahunan Rektor
CREATE TABLE IF NOT EXISTS public.rector_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  title text NOT NULL CHECK (char_length(title) >= 2),
  description text NOT NULL DEFAULT '',
  cover_url text,
  file_url text,
  contact_email text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rector_reports_idx ON public.rector_reports (status, year DESC, sort_order, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS rector_reports_year_uidx ON public.rector_reports (year);

-- Seed awal sesuai data di halaman FE
INSERT INTO public.rector_reports (year, title, description, cover_url, sort_order, status)
VALUES
  (
    2024,
    'Laporan Tahunan Rektor 2024',
    'Dokumen laporan tahunan Rektor Universitas LIA tahun 2024 yang dipublikasikan melalui situs resmi universitas.',
    '/Laporantahunanrektor2024.jpg',
    1,
    'published'
  ),
  (
    2025,
    'Laporan Tahunan Rektor 2025',
    'Dokumen laporan tahunan Rektor Universitas LIA tahun 2025 yang dipublikasikan melalui situs resmi universitas.',
    '/Laporantahunanrektor2025.jpg',
    2,
    'published'
  )
ON CONFLICT DO NOTHING;

