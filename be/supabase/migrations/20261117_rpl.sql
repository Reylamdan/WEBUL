-- Jalur RPL PMB (FE /pmb/jalur-rpl).
-- 1. rpl_settings: Teks pengantar hero, keunggulan, jadwal kuliah note, batas pendaftaran, dan transfer kredit.
-- 2. rpl_steps: Daftar alur pendaftaran RPL (CRUD).
-- 3. rpl_requirements: Daftar syarat pendaftaran dan dokumen pendaftaran (CRUD).
-- 4. rpl_schedules: Daftar hari dan jam perkuliahan (CRUD).
-- 5. rpl_fees: Daftar komponen biaya RPL (CRUD).

CREATE TABLE IF NOT EXISTS public.rpl_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'JALUR PENERIMAAN MAHASISWA BARU',
  hero_title text NOT NULL DEFAULT 'Raih Sarjana dengan Pengalaman Kerja',
  hero_description text NOT NULL DEFAULT 'Merupakan jalur penerimaan mahasiswa baru yang memberikan kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan atas pembelajaran yang telah diperoleh sebelumnya, baik melalui pengalaman kerja, pendidikan formal, informal, maupun nonformal',
  hero_art_mark text NOT NULL DEFAULT 'RPL',
  hero_art_caption text NOT NULL DEFAULT 'PENGALAMANMU\nPUNYA NILAI',
  section_eyebrow text NOT NULL DEFAULT 'JALUR RPL',
  section_title text NOT NULL DEFAULT 'Rekognisi Pembelajaran Lampau (RPL)',
  benefits jsonb NOT NULL DEFAULT '["Lulus lebih cepat", "Kuliah fleksibel", "Hemat biaya"]'::jsonb,
  schedule_note text NOT NULL DEFAULT 'Awal perkuliahan dilaksanakan bulan September 2026 pada:',
  registration_deadline text NOT NULL DEFAULT '31 Juli 2026',
  registration_url text NOT NULL DEFAULT 'https://pmb.universitaslia.ac.id/home',
  transfer_credit_title text NOT NULL DEFAULT 'Transfer Kredit',
  transfer_credit_description text NOT NULL DEFAULT 'Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil evaluasi terhadap pendidikan dan capaian pembelajaran sebelumnya.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.rpl_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Alur Pendaftaran RPL
CREATE TABLE IF NOT EXISTS public.rpl_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpl_steps_idx ON public.rpl_steps (status, sort_order, created_at);

-- 3. Syarat & Dokumen RPL
CREATE TABLE IF NOT EXISTS public.rpl_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('syarat', 'dokumen')),
  title text NOT NULL CHECK (char_length(title) >= 1),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpl_requirements_idx ON public.rpl_requirements (type, status, sort_order);

-- 4. Jadwal Perkuliahan RPL
CREATE TABLE IF NOT EXISTS public.rpl_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL CHECK (char_length(day) BETWEEN 2 AND 100),
  hours text NOT NULL CHECK (char_length(hours) BETWEEN 2 AND 100),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpl_schedules_idx ON public.rpl_schedules (status, sort_order);

-- 5. Rincian Biaya RPL
CREATE TABLE IF NOT EXISTS public.rpl_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (char_length(type) BETWEEN 2 AND 100),
  amount text NOT NULL CHECK (char_length(amount) BETWEEN 1 AND 100),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpl_fees_idx ON public.rpl_fees (status, sort_order);

-- Seed awal alur pendaftaran
INSERT INTO public.rpl_steps (title, description, sort_order, status)
VALUES
  ('Mengisi formulir RPL', 'Lengkapi formulir pendaftaran dan berkas pendukung.', 1, 'published'),
  ('Melakukan pembayaran asesmen', 'Selesaikan pembayaran sesuai instruksi pendaftaran.', 2, 'published'),
  ('Verifikasi formulir dan berkas', 'Berkas pendaftaran akan diperiksa oleh tim terkait.', 3, 'published'),
  ('Mengikuti wawancara dan tes asesmen', 'Ikuti proses asesmen sesuai jadwal yang diberikan.', 4, 'published'),
  ('Pengumuman hasil asesmen', 'Periksa hasil asesmen melalui informasi dari tim PMB.', 5, 'published'),
  ('Melakukan daftar ulang', 'Selesaikan daftar ulang untuk melanjutkan proses penerimaan.', 6, 'published')
ON CONFLICT DO NOTHING;

-- Seed awal syarat pendaftaran
INSERT INTO public.rpl_requirements (type, title, sort_order, status)
VALUES
  ('syarat', 'Lulusan SMA/SMK/MA sederajat yang memiliki pengalaman kerja di bidang yang relevan dengan program studi yang akan ditempuh', 1, 'published'),
  ('syarat', 'Membayar biaya pendaftaran Rp100.000', 2, 'published'),
  ('syarat', 'Memiliki sertifikat pelatihan atau bukti pengalaman kerja yang relevan', 3, 'published'),
  ('syarat', 'Mengikuti asesmen tes', 4, 'published')
ON CONFLICT DO NOTHING;

-- Seed awal dokumen pendaftaran
INSERT INTO public.rpl_requirements (type, title, sort_order, status)
VALUES
  ('dokumen', 'KTP', 1, 'published'),
  ('dokumen', 'Akta kelahiran', 2, 'published'),
  ('dokumen', 'Kartu keluarga', 3, 'published'),
  ('dokumen', 'Ijazah', 4, 'published'),
  ('dokumen', 'Foto background merah', 5, 'published'),
  ('dokumen', 'Daftar Riwayat pekerjaan dengan rincian tugas yang dilakukan', 6, 'published'),
  ('dokumen', 'Sertifikat Kompetensi', 7, 'published'),
  ('dokumen', 'Sertifikat pengoperasian/lisensi yang dimiliki (misalnya, sertifikat pengajaran, dsb.)', 8, 'published'),
  ('dokumen', 'Dokumentasi pekerjaan yang pernah dilakukan (foto/video/produk/hasil tes, dll)', 9, 'published'),
  ('dokumen', 'Buku harian/catatan harian pekerjaan yang dilakukan di tempat kerja', 10, 'published'),
  ('dokumen', 'Lembar tugas / lembar kerja ketika bekerja di perusahaan', 11, 'published'),
  ('dokumen', 'Dokumen analisis/perancangan (parsial atau lengkap) ketika bekerja di perusahaan', 12, 'published'),
  ('dokumen', 'Logbook (Buku Catatan pekerjaan)', 13, 'published'),
  ('dokumen', 'Sertifikat Pelatihan disertai dengan uraian materi pelatihan dan lamanya pelatihan', 14, 'published'),
  ('dokumen', 'Keanggotaan asosiasi profesi yang relevan', 15, 'published'),
  ('dokumen', 'Referensi/surat keterangan/laporan verifikasi pihak ketiga dari pemberi kerja/supervisor', 16, 'published'),
  ('dokumen', 'Penghargaan dari industri', 17, 'published'),
  ('dokumen', 'Penilaian kinerja dari perusahaan.', 18, 'published')
ON CONFLICT DO NOTHING;

-- Seed awal jadwal kuliah
INSERT INTO public.rpl_schedules (day, hours, sort_order, status)
VALUES
  ('Kamis', '16:00 - 22:00 WIB', 1, 'published'),
  ('Jumat', '16:00 - 22:00 WIB', 2, 'published'),
  ('Sabtu', '08:00 - 20:00 WIB', 3, 'published')
ON CONFLICT DO NOTHING;

-- Seed awal biaya RPL
INSERT INTO public.rpl_fees (type, amount, sort_order, status)
VALUES
  ('Pendaftaran', 'Rp100.000', 1, 'published'),
  ('Asesmen', 'Rp3.000.000', 2, 'published'),
  ('Kuliah', 'Rp4.500.000', 3, 'published')
ON CONFLICT DO NOTHING;

