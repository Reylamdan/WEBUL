-- Benchmarking LPM - FE /lpm/kegiatan-lpm/benchmarking dan /admin/lpm/benchmarking.
-- Dokumen disimpan di Google Drive (folder "lpm-benchmarking"); database hanya menyimpan metadata + file ID.

CREATE TABLE IF NOT EXISTS public.lpm_benchmarkings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  institution text NOT NULL DEFAULT '' CHECK (char_length(institution) <= 200),
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 60),
  date date NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  file_name text,
  file_mime_type text,
  file_size bigint,
  file_drive_file_id text,
  file_md5 text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Tidak boleh published tanpa dokumen.
  CONSTRAINT lpm_benchmarkings_publish_needs_document
    CHECK (status <> 'published' OR file_drive_file_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS lpm_benchmarkings_list_idx
  ON public.lpm_benchmarkings (status, date DESC, created_at DESC);

ALTER TABLE public.lpm_benchmarkings ENABLE ROW LEVEL SECURITY;
