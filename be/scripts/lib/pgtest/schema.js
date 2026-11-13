// Skema uji. PENTING: ini REKONSTRUKSI untuk pengujian, bukan salinan skema produksi Anda.
//
// Hanya ada dua fakta tentang constraint lama yang diketahui dari pemeriksaan SQL Supabase:
//   - namanya `acc_inst_document` dan `accreditation_institutions_document_one_source`
//   - `acc_inst_document` mengaitkan metadata dokumen dengan `document_path`
// Definisi persisnya TIDAK diketahui, maka disediakan beberapa varian "aturan lama". Migrasi tidak bergantung
// pada definisi lama (constraint dihapus berdasarkan nama), dan tes membuktikannya untuk semua varian.

const OLD_VARIANTS = {
  // A: semua-atau-tidak-sama-sekali, terikat pada document_path
  A_all_or_nothing_on_path: `
    constraint acc_inst_document check (
      (document_path is null and document_name is null and document_mime is null and document_size is null)
      or
      (document_path is not null and document_name is not null and document_mime is not null and document_size is not null)
    ),
    constraint accreditation_institutions_document_one_source check (document_path is null or document_drive_file_id is null)`,
  // B: lebih ketat: ada pemeriksaan isi (mime tertentu, ukuran positif) tetap terikat pada document_path
  B_strict_on_path: `
    constraint acc_inst_document check (
      (document_path is null and document_name is null and document_mime is null and document_size is null)
      or
      (document_path is not null and document_name is not null
        and document_mime in ('application/pdf','image/jpeg','image/png')
        and document_size > 0 and document_size <= 10485760)
    ),
    constraint accreditation_institutions_document_one_source check (num_nonnulls(document_path, document_drive_file_id) <= 1)`,
  // C: bentuk ekuivalensi null
  C_null_equivalence: `
    constraint acc_inst_document check (
      (document_path is null) = (document_name is null)
      and (document_name is null) = (document_mime is null)
      and (document_mime is null) = (document_size is null)
    ),
    constraint accreditation_institutions_document_one_source check (not (document_path is not null and document_drive_file_id is not null))`,
};

const institutionsTable = (variantSql, { driveColumns = true } = {}) => `
  create table public.accreditation_institutions (
    id uuid primary key default gen_random_uuid(),
    institution_name text not null default 'Universitas LIA',
    rank text,
    sk_number text not null,
    decision_date date,
    valid_from date,
    valid_until date,
    issuing_body text not null default 'BAN-PT',
    document_path text,
    document_name text,
    document_mime text,
    document_size bigint,
    ${driveColumns ? "document_drive_file_id text,\n    document_md5 text," : ""}
    status text not null default 'draft' check (status in ('draft','published','archived')),
    published_at timestamptz,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint acc_inst_dates check (valid_from is null or valid_until is null or valid_until >= valid_from),
    ${variantSql.trim()}
  );
  create unique index acc_inst_sk_unique on public.accreditation_institutions (lower(btrim(sk_number)));
`;

// Tabel program studi SEBAGAI PEMBANDING: tidak boleh tersentuh migrasi. (Constraint-nya sengaja sederhana.)
const studyProgramsTable = `
  create table public.accreditation_study_programs (
    id uuid primary key default gen_random_uuid(),
    program_name text not null,
    education_level text not null,
    faculty text,
    rank text,
    sk_number text not null,
    decision_date date,
    valid_from date, valid_until date,
    issuing_body text not null default 'BAN-PT',
    document_path text, document_name text, document_mime text, document_size bigint,
    document_drive_file_id text, document_md5 text,
    status text not null default 'draft',
    published_at timestamptz,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint acc_prog_document check (
      (document_path is null and document_drive_file_id is null and document_name is null and document_mime is null and document_size is null)
      or (document_name is not null and document_mime is not null and document_size is not null
          and (document_path is not null or document_drive_file_id is not null))
    )
  );
`;

const cleanupQueueTable = `
  create table public.drive_cleanup_queue (
    id uuid primary key default gen_random_uuid(),
    file_id text not null,
    reason text,
    last_error text,
    attempts integer not null default 0,
    created_at timestamptz not null default now()
  );
  create unique index drive_cleanup_queue_file_id on public.drive_cleanup_queue (file_id);
`;

// Tabel admins: hanya kolom yang dipakai kode/relasi. Skema produksi (mis. CHECK email,
// trigger updated_at) TIDAK direkonstruksi di sini.
const adminsTable = `
  create table public.admins (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    password_hash text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create unique index admins_email_unique on public.admins (lower(email));
`;

// Disalin dari migrations/20261110_create_media_videos_table.sql agar constraint/index
// (termasuk unique parsial "satu video aktif per konten") diuji oleh PostgreSQL sungguhan.
const mediaVideosTable = `
  create table public.media_videos (
    id uuid primary key default gen_random_uuid(),
    owner_module varchar(50) not null,
    record_id uuid not null,
    public_id text not null,
    secure_url text not null,
    thumbnail_url text not null,
    resource_type varchar(20) not null default 'video',
    format varchar(20) not null,
    bytes bigint not null check (bytes > 0),
    duration numeric(10, 2) check (duration >= 0),
    width integer check (width > 0),
    height integer check (height > 0),
    status varchar(20) not null default 'active' check (status in ('active', 'archived', 'deleted')),
    uploaded_by uuid references public.admins(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint media_videos_public_id_unique unique (public_id)
  );
  create index idx_media_videos_owner on public.media_videos (owner_module, record_id);
  create index idx_media_videos_status on public.media_videos (status);
  create unique index uq_media_videos_active_owner
    on public.media_videos (owner_module, record_id) where status = 'active';
`;

const mediaCleanupQueueTable = `
  create table public.media_cleanup_queue (
    id uuid primary key default gen_random_uuid(),
    public_id text not null,
    resource_type varchar(20) not null default 'video',
    reason text,
    last_error text,
    attempts integer not null default 0,
    created_at timestamptz not null default now(),
    constraint media_cleanup_queue_public_id_unique unique (public_id)
  );
  create index idx_media_cleanup_queue_attempts on public.media_cleanup_queue (attempts);
`;

// Paket tabel untuk tes media. Urutan penting: media_videos mereferensikan admins.
const mediaTables = [adminsTable, mediaVideosTable, mediaCleanupQueueTable].join("\n");

module.exports = {
  OLD_VARIANTS,
  institutionsTable,
  studyProgramsTable,
  cleanupQueueTable,
  adminsTable,
  mediaVideosTable,
  mediaCleanupQueueTable,
  mediaTables,
};
