-- Google Drive OAuth 2.0: tabel kredensial + state, antrean pembersihan file, dan kolom Drive pada BAN-PT.
-- JALANKAN DI SUPABASE (SQL Editor) SEBELUM menghubungkan akun Google dan mengunggah dokumen.
-- Aman dijalankan berulang (IF NOT EXISTS). Tidak mengubah/menghapus data yang sudah ada.
--
-- Mengapa perlu: src/services/googleOAuthStore.js membaca/menulis google_oauth_credentials dan
-- google_oauth_states. Tanpa tabel ini, status koneksi dan penyimpanan refresh token gagal
-- (500 OAUTH_STORE_ERROR) walaupun .env sudah benar.

-- ---------------------------------------------------------------------------------------------
-- 1. Kredensial OAuth: SATU baris (id = 'primary'). refresh_token_enc = ciphertext AES-256-GCM
--    (kunci dari GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY); access token TIDAK pernah disimpan.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_oauth_credentials (
  id                    text        PRIMARY KEY,
  status                text        NOT NULL DEFAULT 'disconnected'
                                    CHECK (status IN ('connected', 'reauth_required', 'disconnected')),
  connection_id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_permission_id text,
  account_email         text,
  account_name          text,
  refresh_token_enc     text,
  scope                 text,
  root_folder_id        text,
  connected_by          uuid,
  connected_at          timestamptz,
  last_refresh_at       timestamptz,
  last_error_code       text,
  last_error_at         timestamptz,
  disconnected_by       uuid,
  disconnected_at       timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------------------------
-- 2. State OAuth sekali pakai: hanya HASH state + PKCE code_verifier terenkripsi.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  state_hash        text        PRIMARY KEY,
  code_verifier_enc text        NOT NULL,
  admin_id          uuid        NOT NULL,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_oauth_states_expires_idx ON public.google_oauth_states (expires_at);

-- Tabel berisi ciphertext token: kunci rapat. Backend memakai service role (melewati RLS);
-- tanpa policy apa pun, akses lewat anon/authenticated key otomatis ditolak.
ALTER TABLE public.google_oauth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_oauth_states      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------------------
-- 3. Antrean pembersihan file Drive yang gagal dihapus (src/utils/driveStorage.js).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drive_cleanup_queue (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id    text        NOT NULL,
  reason     text,
  last_error text,
  attempts   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS drive_cleanup_queue_file_id ON public.drive_cleanup_queue (file_id);

ALTER TABLE public.drive_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------------------
-- 4. Kolom metadata Drive pada peraturan BAN-PT (src/services/banptRegulationService.js).
--    Hanya menambah kolom bila belum ada; constraint yang sudah ada tidak disentuh.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.banpt_regulations ADD COLUMN IF NOT EXISTS document_drive_file_id text;
ALTER TABLE public.banpt_regulations ADD COLUMN IF NOT EXISTS document_md5           text;
ALTER TABLE public.banpt_regulations ADD COLUMN IF NOT EXISTS document_size          bigint;
