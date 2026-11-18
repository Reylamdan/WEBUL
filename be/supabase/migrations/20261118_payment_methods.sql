-- Cara Pembayaran PMB (FE /pmb/cara-pembayaran).
-- 1. payment_guide_settings: Pengaturan teks hero, teks bagian SiAkad, gambar screenshot SiAkad, dan teks bagian kanal pembayaran.
-- 2. payment_va_steps: Langkah-langkah generate Virtual Account di SiAkad (CRUD).
-- 3. payment_channels: Kanal pembayaran (ATM Mandiri, Livin by Mandiri, Cabang Mandiri, Mobile Banking bank lain, ATM bank lain) (CRUD).

CREATE TABLE IF NOT EXISTS public.payment_guide_settings (
  id text PRIMARY KEY DEFAULT 'main',
  hero_eyebrow text NOT NULL DEFAULT 'INFORMASI PEMBAYARAN',
  hero_title text NOT NULL DEFAULT 'Cara Pembayaran',
  hero_description text NOT NULL DEFAULT 'Ikuti panduan berikut untuk membuat kode Virtual Account dari SiAkad dan membayar tagihan kuliah melalui berbagai kanal pembayaran.',
  va_section_eyebrow text NOT NULL DEFAULT 'PANDUAN SIAKAD',
  va_section_title text NOT NULL DEFAULT 'Generated kode bayar atau Virtual Account (VA)',
  va_section_description text NOT NULL DEFAULT 'Buat kode pembayaran melalui menu Riwayat Keuangan di sistem informasi akademik.',
  va_image_1_url text NOT NULL DEFAULT '/Screenshot%20from%202026-11-10%2009-21-35.png',
  va_image_1_alt text NOT NULL DEFAULT 'Menu profil SiAkad dengan pilihan Tagihan Mahasiswa',
  va_image_1_caption text NOT NULL DEFAULT 'Buka menu profil, lalu pilih Tagihan Mahasiswa untuk melihat tagihan.',
  va_image_2_url text NOT NULL DEFAULT '/Screenshot%20from%202026-11-10%2009-21-49.png',
  va_image_2_alt text NOT NULL DEFAULT 'Halaman Riwayat Keuangan dengan metode pembayaran Mandiri dan tombol Bayar Tagihan',
  va_image_2_caption text NOT NULL DEFAULT 'Pada halaman keuangan, pilih metode pembayaran dan klik Bayar Tagihan.',
  methods_section_eyebrow text NOT NULL DEFAULT 'PILIH KANAL PEMBAYARAN',
  methods_section_title text NOT NULL DEFAULT 'Panduan pembayaran',
  methods_section_description text NOT NULL DEFAULT 'Gunakan kode bayar atau nomor Virtual Account yang sudah diterbitkan melalui SiAkad.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_guide_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 2. Langkah-langkah Generate VA di SiAkad
CREATE TABLE IF NOT EXISTS public.payment_va_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_va_steps_idx ON public.payment_va_steps (status, sort_order, created_at);

-- 3. Kanal Pembayaran (Payment Channels)
CREATE TABLE IF NOT EXISTS public.payment_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL CHECK (char_length(channel_id) BETWEEN 2 AND 100),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  technical_note_title text,
  technical_note text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_channels_idx ON public.payment_channels (status, sort_order, created_at);

-- Seed awal langkah SiAkad
INSERT INTO public.payment_va_steps (title, description, sort_order, status)
VALUES
  ('Login SiAkad', 'Login pada sistem informasi akademik kampus.', 1, 'published'),
  ('Pilih menu Riwayat Keuangan', 'Klik profil, lalu pilih Riwayat Keuangan.', 2, 'published'),
  ('Pilih tagihan', 'Centang pada tagihan yang ingin dibayar.', 3, 'published'),
  ('Klik Generated Virtual Account', 'Klik tombol Generated Virtual Account.', 4, 'published'),
  ('Berhasil mendapat Virtual Account', 'Simpan kode VA yang didapatkan dan bayarkan sebelum jatuh tempo (expired kode pembayaran).', 5, 'published')
ON CONFLICT DO NOTHING;

-- Seed awal kanal pembayaran
INSERT INTO public.payment_channels (channel_id, name, steps, note, technical_note_title, technical_note, sort_order, status)
VALUES
  (
    'atm-mandiri',
    'Pembayaran melalui ATM Mandiri',
    '[
      "Masukkan kartu ATM dan PIN.",
      "Pilih menu BAYAR/BELI, lalu pilih menu LAINNYA → Multipayment.",
      "Masukkan kode perusahaan/institusi, yaitu 89631 atau EDUFIN dari Kode Virtual Account (VA) pada Sistem Informasi Akademik (SIAKAD). Contoh: 8963157000001.",
      "Konfirmasi: tekan 1, kemudian tekan OK.",
      "Transaksi selesai.",
      "Simpan struk pembayaran."
    ]'::jsonb,
    NULL,
    NULL,
    NULL,
    1,
    'published'
  ),
  (
    'livin-mandiri',
    'Pembayaran melalui Livin’ by Mandiri',
    '[
      "Login pada aplikasi Livin’ by Mandiri.",
      "Pilih menu BAYAR/VA.",
      "Pilih menu PENDIDIKAN.",
      "Ketik nama biller “EDUFIN” atau ketik kode biller “89631”.",
      "Input KODE BAYAR atau Nomor VA yang didapatkan dari Sistem Informasi Akademik. Contoh: 8963157000001, lalu klik lanjutkan.",
      "Periksa kembali detail transaksi. Jika sudah benar, klik Lanjut Bayar.",
      "Pembayaran selesai. Struk bukti bayar dapat di-share dan di-download sebagai bukti pembayaran."
    ]'::jsonb,
    NULL,
    NULL,
    NULL,
    2,
    'published'
  ),
  (
    'cabang-mandiri',
    'Pembayaran melalui Cabang Mandiri',
    '[
      "Ambil aplikasi setoran/transfer/kliring/inkaso dan isikan tanggal sesuai dengan tanggal pada saat melakukan transaksi.",
      "Beri tanda pada kolom: Setoran ke Rekening Sendiri jika sumber dana tunai, atau Transfer jika sumber dana dari rekening.",
      "Beri tanda pada kolom “Penduduk” jika penerima dan pengirim adalah penduduk Indonesia.",
      "Isi nama pengirim sesuai dengan nama penyetor.",
      "Isi nama penerima dengan 89631 atau EduFin.",
      "Isi nama Bank dengan BANK MANDIRI.",
      "Pada nomor rekening, isi dengan Kode Virtual Account (VA) dari Sistem Informasi Akademik (SIAKAD). Contoh: 8963157000001.",
      "Beri tanda pada sumber dana transaksi (tunai/debet rekening)."
    ]'::jsonb,
    NULL,
    NULL,
    NULL,
    3,
    'published'
  ),
  (
    'mobile-banking-bank-lain',
    'Pembayaran melalui Mobile Banking bank lain',
    '[
      "Login aplikasi mobile banking.",
      "Pilih menu TRANSFER KE BANK LAIN / ANTAR BANK (ONLINE).",
      "Pilih bank tujuan MANDIRI.",
      "Input KODE BAYAR/VA pada rekening tujuan. Contoh: 8963100000001.",
      "Input NOMINAL PEMBAYARAN sesuai dengan tagihan pada Sistem Informasi Akademik (SIAKAD).",
      "Pilih layanan atau metode transfer ONLINE.",
      "Klik LANJUTKAN.",
      "Apabila transaksi telah berhasil, STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran."
    ]'::jsonb,
    'Pastikan memilih metode/layanan transfer dengan jenis ONLINE (BUKAN RTGS dan BUKAN BI FAST).',
    'Ketentuan nominal pembayaran',
    'Saat menginput nominal tagihan pada Mobile Banking bank lain, pastikan nominal yang diinput hanya nominal tagihan saja. Abaikan biaya administrasi sebesar Rp4.000.',
    4,
    'published'
  ),
  (
    'atm-bank-lain',
    'Pembayaran melalui ATM bank lain',
    '[
      "Pilih menu TRANSFER BANK LAIN atau TRANSFER ONLINE ANTAR BANK.",
      "Masukkan kode bank MANDIRI (008) atau pilih bank yang dituju, yaitu MANDIRI.",
      "Masukkan KODE BAYAR (Nomor Virtual Account) pada kolom rekening tujuan. Contoh: 8963100000001.",
      "Masukkan NOMINAL transfer sesuai tagihan yang tampil pada Sistem Informasi Akademik (SIAKAD).",
      "Konfirmasi pembayaran akan tampil pada layar. Apabila sudah sesuai, silakan lanjutkan hingga selesai.",
      "Transaksi sukses dan STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran."
    ]'::jsonb,
    NULL,
    NULL,
    NULL,
    5,
    'published'
  )
ON CONFLICT DO NOTHING;

