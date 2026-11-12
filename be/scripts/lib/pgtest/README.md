# pgtest: tes terhadap PostgreSQL sungguhan

Folder ini mendukung `scripts/testAccreditationConstraints.js`: membuat cluster PostgreSQL sementara,
menjalankan migrasi SQL asli, lalu menjalankan kode service/controller asli terhadap database itu.

Tes ini **tidak** menyentuh Supabase, tidak memakai kredensial, dan tidak memakai jaringan. Jika
`initdb`/`pg_ctl`/`psql` tidak tersedia, tes dilewati dengan kode keluar `2` (bukan lulus).

## Tabel yang direkonstruksi (`schema.js`)

| Tabel | Status | Catatan |
| --- | --- | --- |
| `accreditation_institutions` | Direkonstruksi + 3 varian constraint lama | Fokus migrasi dokumen Drive. |
| `accreditation_study_programs` | Direkonstruksi (sederhana) | Pembanding: tidak boleh tersentuh migrasi. |
| `drive_cleanup_queue` | Direkonstruksi | Dipakai jalur orphan Drive. |
| `admins` | Direkonstruksi minimal | Hanya kolom yang dipakai kode/relasi. |
| `media_videos` | Direkonstruksi dari `migrations/20261110_create_media_videos_table.sql` | Termasuk CHECK dan unique parsial `status='active'`. |
| `media_cleanup_queue` | Direkonstruksi dari migrasi yang sama | Termasuk unique `public_id`. |

`mediaTables` mengekspor ketiga tabel media (admins + media_videos + media_cleanup_queue) agar tes
media di masa depan dapat memakai constraint asli, bukan tiruan JavaScript.

## Tabel yang TIDAK direkonstruksi

Belum ada skema PostgreSQL uji untuk:

- `news`, `announcements` (termasuk relasi penulis ke `admins`);
- `banpt_regulations`;
- `content_translations`;
- `google_oauth_credentials`, `google_oauth_states`;
- tabel/view lain yang tidak dipakai jalur akreditasi/media.

Untuk tabel-tabel itu, pengujian saat ini memakai `scripts/lib/fakeSupabase.js` (di memori) atau belum
diuji sama sekali. Jangan menganggap tes offline membuktikan constraint/RLS tabel tersebut.

## Batas kesetiaan tiruan

`supabasePg.js` adalah adaptor mini, bukan supabase-js lengkap. Ia mendukung `select/insert/update/delete`,
`eq/is/lte/gte/lt/gt/ilike/in/order/range`, `single/maybeSingle`, `faults`, dan `hooks.beforeUpdate`.
Yang tidak didukung/disimulasikan:

- `or()`, `limit()`, `upsert()`, join/embedded select, dan operator PostgREST lanjutan;
- RLS, policy, grant, trigger, function, dan default yang kompleks;
- tipe `jsonb` dan konversi tipe lanjutan;
- timeout jaringan, retry, dan perilaku pool koneksi.

`fakeSupabase.js` (di memori) lebih lengkap untuk bentuk hasil dan operator, tetapi **tidak** menegakkan
constraint SQL, unique index, FK, atau RLS. Karena itu ia tidak menggantikan tes pgtest.

## Menjalankan

```bash
npm run test:constraints
```

Set `TEST_PG_BIN` ke folder `bin` PostgreSQL bila executable tidak ada di `PATH`.
