-- Syarat dan Ketentuan Mahasiswa Asing (FE /pmb/mahasiswa-asing).
-- 1. foreign_student_settings: Teks hero, intro, heading persyaratan, dan referensi dokumen.
-- 2. foreign_student_requirements: Butir-butir syarat & dokumen persyaratan mahasiswa asing (CRUD).

CREATE TABLE IF NOT EXISTS public.foreign_student_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_title text NOT NULL DEFAULT 'Mahasiswa Asing',
  intro_eyebrow text NOT NULL DEFAULT 'PENERIMAAN MAHASISWA',
  intro_title text NOT NULL DEFAULT 'Selamat datang di Universitas LIA',
  intro_description text NOT NULL DEFAULT 'Mahasiswa asing adalah warga negara asing yang akan mengikuti pendidikan pada Universitas LIA.',
  requirements_eyebrow text NOT NULL DEFAULT 'PERSIAPAN DOKUMEN',
  requirements_title text NOT NULL DEFAULT 'Syarat dan Ketentuan',
  requirements_description text NOT NULL DEFAULT 'Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib memenuhi dokumen persyaratan yang digunakan untuk mengurus izin belajar dibawah ini:',
  reference_title text NOT NULL DEFAULT 'Referensi Dokumen',
  reference_description text NOT NULL DEFAULT 'Contoh dokumen persyaratan dapat dilihat melalui link:',
  reference_url text NOT NULL DEFAULT 'https://izinbelajar.kemdiktisaintek.go.id',
  reference_label text NOT NULL DEFAULT 'izinbelajar.kemdiktisaintek.go.id',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.foreign_student_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Butir Persyaratan Dokumen
CREATE TABLE IF NOT EXISTS public.foreign_student_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text NOT NULL CHECK (char_length(description) >= 3),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foreign_student_requirements_idx ON public.foreign_student_requirements (status, sort_order, created_at);

-- Seed awal sesuai 9 butir di halaman FE
INSERT INTO public.foreign_student_requirements (title, description, sort_order, status)
VALUES
  (
    'Paspor',
    'Paspor',
    1,
    'published'
  ),
  (
    'Surat Pernyataan',
    'Surat Pernyataan tidak akan bekerja selama belajar di Indonesia, tidak berpartisipasi di dalam aktivitas politik dan mematuhi peraturan perundang-undangan yang ada di Indonesia (bermeterai)',
    2,
    'published'
  ),
  (
    'Ijazah & Transkrip',
    'Ijazah yang telah disetarakan, transkrip akademik, dan rapor terakhir',
    3,
    'published'
  ),
  (
    'Surat Jaminan Pembiayaan',
    'Surat Keterangan Jaminan Pembiayaan',
    4,
    'published'
  ),
  (
    'Surat Keterangan Sehat',
    'Surat Keterangan Sehat',
    5,
    'published'
  ),
  (
    'Foto Berwarna',
    'Foto berwarna ukuran paspor',
    6,
    'published'
  ),
  (
    'Paspor Penjamin',
    'Paspor orang tua atau penjamin',
    7,
    'published'
  ),
  (
    'KITAS',
    'Keterangan Izin Tinggal Terbatas / KITAS (khusus izin perpanjangan)',
    8,
    'published'
  ),
  (
    'Letter of Acceptance',
    'Surat keterangan diterima di Universitas LIA (Letter of Acceptance)',
    9,
    'published'
  )
ON CONFLICT DO NOTHING;

