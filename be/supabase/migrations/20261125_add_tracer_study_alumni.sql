-- Data diri alumni yang mengisi form tracer study (halaman publik).
-- Jalankan di Supabase SQL Editor SEBELUM deploy backend versi ini.
--
-- Jawaban survei tetap disimpan di tabel tracer_study_responses (anonim, dipakai statistik).
-- Data diri sengaja disimpan di tabel TERPISAH supaya statistik publik tidak pernah memuat identitas.
-- response_id menunjuk ke tracer_study_responses.id (tanpa foreign key karena tipe id tabel itu
-- bisa uuid atau bigint; backend yang menjaga konsistensinya).

create table if not exists public.tracer_study_alumni (
  id uuid primary key default gen_random_uuid(),
  survey_year integer not null,
  full_name text not null,
  nim text not null,
  study_program text not null,
  graduation_year integer not null,
  email text not null,
  phone text,
  response_id text,
  submission_channel text not null default 'form'
    check (submission_channel in ('form', 'basketball')),
  created_at timestamptz not null default now()
);

-- Satu alumni (NIM) hanya boleh mengisi satu kali per tahun survei.
create unique index if not exists tracer_study_alumni_nim_year_key
  on public.tracer_study_alumni (survey_year, lower(nim));

create index if not exists tracer_study_alumni_created_at_idx
  on public.tracer_study_alumni (created_at desc);

-- Tabel hanya diakses lewat backend (service role); blokir akses langsung dari klien.
alter table public.tracer_study_alumni enable row level security;
