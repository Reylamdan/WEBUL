-- Laporan Tahunan Audit Mutu Internal - FE /lpm/laporan-lpm/laporan-tahunan-audit-mutu-internal
-- dan /admin/lpm/laporan-audit-mutu. Satu laporan per tahun; dokumen disimpan di Google Drive
-- (folder "lpm-laporan-audit-mutu"), database hanya menyimpan metadata + file ID.
-- Laporan boleh dipublikasikan tanpa dokumen: FE menampilkan "Arsip belum tersedia".

CREATE TABLE IF NOT EXISTS public.lpm_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  file_name text,
  file_mime_type text,
  file_size bigint,
  file_drive_file_id text,
  file_md5 text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lpm_audit_reports_year_uidx
  ON public.lpm_audit_reports (year);

ALTER TABLE public.lpm_audit_reports ENABLE ROW LEVEL SECURITY;

-- Seed awal sesuai halaman FE (2025 & 2024), hanya jika tabel masih kosong.
INSERT INTO public.lpm_audit_reports (year, title, description, status)
SELECT * FROM (VALUES
  (2025, 'Laporan Tahunan Audit Mutu Internal 2025', 'Informasi dan dokumen laporan tahunan Audit Mutu Internal tahun 2025.', 'published'),
  (2024, 'Laporan Tahunan Audit Mutu Internal 2024', 'Informasi laporan Audit Mutu Internal tahun 2024.', 'published')
) AS seed(year, title, description, status)
WHERE NOT EXISTS (SELECT 1 FROM public.lpm_audit_reports);
