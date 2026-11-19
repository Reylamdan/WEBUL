-- Kegiatan LPM - FE /lpm/kegiatan-lpm dan /admin/lpm/kegiatan.
-- Daftar kartu kegiatan penjaminan mutu: judul, deskripsi, tanggal (opsional), tautan (opsional).

CREATE TABLE IF NOT EXISTS public.lpm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  activity_date date,
  link_url text CHECK (link_url IS NULL OR char_length(link_url) <= 500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lpm_activities_list_idx
  ON public.lpm_activities (status, sort_order, activity_date, created_at);

ALTER TABLE public.lpm_activities ENABLE ROW LEVEL SECURITY;

-- Seed awal sesuai isi halaman FE /lpm/kegiatan-lpm (hanya jika tabel masih kosong).
INSERT INTO public.lpm_activities (title, description, activity_date, link_url, sort_order, status)
SELECT * FROM (VALUES
  ('Sosialisasi Standar Mutu & SOP', 'Kegiatan sosialisasi standar mutu dan prosedur operasional.', DATE '2024-05-08', NULL, 1, 'published'),
  ('Sosialisasi AMI', 'Sosialisasi pelaksanaan Audit Mutu Internal.', DATE '2024-05-15', NULL, 2, 'published'),
  ('Pelaksanaan AMI', 'Pelaksanaan Audit Mutu Internal di lingkungan Universitas LIA.', DATE '2024-07-10', NULL, 3, 'published'),
  ('Review Hasil AMI', 'Tinjauan hasil Audit Mutu Internal sebagai bahan evaluasi dan tindak lanjut.', DATE '2024-07-24', NULL, 4, 'published'),
  ('Benchmarking', 'Informasi kegiatan benchmarking penjaminan mutu Universitas LIA.', NULL::date, '/lpm/kegiatan-lpm/benchmarking', 5, 'published')
) AS seed(title, description, activity_date, link_url, sort_order, status)
WHERE NOT EXISTS (SELECT 1 FROM public.lpm_activities);
