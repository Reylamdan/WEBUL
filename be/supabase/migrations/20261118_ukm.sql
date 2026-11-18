-- Kegiatan Mahasiswa (UKM) - FE /kehidupan-kampus/kegiatan-mahasiswa dan /kehidupan-kampus/ukm.
-- 1. ukm_settings: Teks hero, intro, bidang kegiatan, komunitas, dan CTA & modal pendaftaran.
-- 2. ukm_items: Data Unit Kegiatan Mahasiswa (UKM) / Komunitas Mahasiswa (CRUD).

CREATE TABLE IF NOT EXISTS public.ukm_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'ORGANISASI & KOMUNITAS',
  hero_title text NOT NULL DEFAULT 'Kegiatan Mahasiswa (UKM)',
  hero_subtitle text NOT NULL DEFAULT 'Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas.',
  hero_badge text NOT NULL DEFAULT 'Universitas LIA — Komunitas & UKM',
  intro_eyebrow text NOT NULL DEFAULT 'KOMUNITAS MAHASISWA',
  intro_title text NOT NULL DEFAULT 'Temukan komunitas yang sesuai dengan minatmu',
  intro_description text NOT NULL DEFAULT 'UKM menjadi ruang untuk belajar bersama, mengasah kemampuan, dan menciptakan pengalaman kampus yang berkesan.',
  category_title text NOT NULL DEFAULT 'Jelajahi bidang kegiatan',
  category_desc text NOT NULL DEFAULT 'Pilih bidang yang paling dekat dengan minat dan ketertarikanmu.',
  cards_title text NOT NULL DEFAULT 'Kenali komunitas mahasiswa',
  cards_desc text NOT NULL DEFAULT 'Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi setelah data resmi tersedia.',
  cta_title text NOT NULL DEFAULT 'Tertarik bergabung dengan UKM?',
  cta_description text NOT NULL DEFAULT 'Informasi kontak, jadwal open recruitment, dan tautan pendaftaran akan ditambahkan di sini.',
  cta_button_label text NOT NULL DEFAULT 'Informasi Pendaftaran',
  modal_title text NOT NULL DEFAULT 'Pendaftaran Kegiatan Mahasiswa (UKM)',
  modal_subtitle text NOT NULL DEFAULT 'Informasi Open Recruitment Universitas LIA',
  modal_schedule_text text NOT NULL DEFAULT 'Pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik.',
  modal_requirements_text text NOT NULL DEFAULT 'Mahasiswa aktif Universitas LIA dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa.',
  modal_contact_email text NOT NULL DEFAULT 'kemahasiswaan@universitaslia.ac.id',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ukm_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Butir UKM / Komunitas
CREATE TABLE IF NOT EXISTS public.ukm_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) >= 2),
  category text NOT NULL CHECK (category IN ('seni', 'olahraga', 'teknologi', 'organisasi', 'sosial')),
  category_label text NOT NULL,
  description text NOT NULL,
  meta text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ukm_items_idx ON public.ukm_items (status, category, sort_order, created_at);

-- Seed awal sesuai 5 UKM di halaman FE
INSERT INTO public.ukm_items (title, category, category_label, description, meta, sort_order, status)
VALUES
  (
    'Seni dan kreativitas',
    'seni',
    'Seni & Kreativitas',
    'Ruang untuk berekspresi melalui karya, pertunjukan, dan kegiatan kreatif.',
    'Tanggal / informasi selengkapnya',
    1,
    'published'
  ),
  (
    'Olahraga dan kebugaran',
    'olahraga',
    'Olahraga',
    'Bangun kerja sama tim, disiplin, dan semangat sportif melalui aktivitas olahraga.',
    'Tanggal / informasi selengkapnya',
    2,
    'published'
  ),
  (
    'Teknologi dan komunitas',
    'teknologi',
    'Teknologi',
    'Berbagi pengetahuan, mengembangkan keterampilan, dan mencoba ide baru bersama.',
    'Tanggal / informasi selengkapnya',
    3,
    'published'
  ),
  (
    'Organisasi dan kepemimpinan',
    'organisasi',
    'Organisasi',
    'Kembangkan jiwa kepemimpinan, manajemen organisasi, dan jejaring kolaboratif.',
    'Tanggal / informasi selengkapnya',
    4,
    'published'
  ),
  (
    'Sosial dan kerohanian',
    'sosial',
    'Sosial & Kerohanian',
    'Menumbuhkan empati sosial, kebersamaan, dan pembinaan nilai-nilai spiritual di kampus.',
    'Tanggal / informasi selengkapnya',
    5,
    'published'
  )
ON CONFLICT DO NOTHING;

