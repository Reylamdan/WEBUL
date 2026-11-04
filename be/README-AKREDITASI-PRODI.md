# Update: Pencarian Akreditasi Program Studi

Database **tidak perlu diubah** dan **tidak ada file migration**. Seluruh fitur memakai kolom
`accreditation_study_programs` yang sudah ada. Status kedaluwarsa dihitung dari `valid_until`.

## Endpoint

| Endpoint | Akses | Keterangan |
|---|---|---|
| `GET /api/accreditation/study-programs` | Publik | Hanya `published` dan `published_at <= sekarang` |
| `GET /api/admin/accreditation/study-programs` | Admin | Draft + published |
| `GET /api/accreditation/study-programs/filter-options` | Publik | **Baru**: opsi dropdown dari data published |
| `GET /api/admin/accreditation/study-programs/filter-options` | Admin | **Baru**: opsi dropdown dari semua data |

## Parameter query (semua opsional, boleh digabung = AND)

| Parameter | Contoh | Keterangan |
|---|---|---|
| `page`, `limit` | `page=2&limit=20` | Lama. Limit 1-50, default 10 |
| `search` | `search=informasi` | Lama. Cari di nama, fakultas, nomor SK, peringkat |
| `level` | `level=S1` | Lama. Jenjang, persis, tidak sensitif huruf |
| `rank` | `rank=Baik Sekali` | Peringkat, persis, tidak sensitif huruf. Nilai bebas |
| `status` | `status=draft` | Lama, **hanya admin** (`draft`/`published`). Diabaikan di publik |
| `programName` | `programName=informasi` | Nama prodi, sebagian kata, tidak sensitif huruf |
| `skNumber` | `skNumber=123/SK` | Nomor SK, sebagian, tidak sensitif huruf |
| `decisionYear` | `decisionYear=2024` | Tahun `decision_date` (4 digit, 1900-2100). Tanggal kosong tidak ikut |
| `validUntilFrom` | `validUntilFrom=2026-01-01` | `valid_until >=` (YYYY-MM-DD, inklusif) |
| `validUntilTo` | `validUntilTo=2026-12-31` | `valid_until <=` (inklusif). Tidak boleh lebih awal dari From |
| `expiryStatus` | `expiryStatus=expiring` | `active` / `expiring` / `expired` / `unknown` |

Contoh gabungan:
`/api/accreditation/study-programs?level=S1&rank=Unggul&decisionYear=2024&expiryStatus=active&page=1&limit=10`

Query tidak valid menghasilkan `400` dengan `code: "VALIDATION_ERROR"` dan daftar `errors`.

## Aturan status kedaluwarsa

`valid_until` = hari terakhir akreditasi masih berlaku (inklusif). "Hari ini" mengikuti zona
**Asia/Jakarta** (bisa diganti lewat `ACCREDITATION_TIMEZONE`), bukan zona waktu server.

- `unknown`: `valid_until` kosong
- `expired`: `valid_until` < hari ini
- `expiring`: hari ini <= `valid_until` <= hari ini + 90 hari (**yang berakhir hari ini masih expiring**)
- `active`: `valid_until` > hari ini + 90 hari

Setiap item program studi kini juga memuat `expiryStatus` dan `daysUntilExpiry` (field tambahan;
field lama tidak berubah). Akreditasi institusi tidak berubah.

## Catatan perubahan perilaku
- Parameter `rank` sebelumnya diterima validator tetapi **tidak diterapkan** di query. Sekarang berfungsi.
- `level` sekarang tidak sensitif huruf besar/kecil (sebelumnya persis).

## Menjalankan test (offline, tanpa Supabase asli)

```
npm run test:accreditation           # test lama, 91 test
npm run test:accreditation-search    # test pencarian baru, 49 test
```

## File
- Baru: `src/utils/accreditationExpiry.js`, `scripts/testAccreditationSearch.js`, `README-AKREDITASI-PRODI.md`
- Diubah: `src/validators/accreditationValidator.js`, `src/services/accreditationService.js`,
  `src/controllers/{admin,public}AccreditationController.js`, `src/routes/{admin,public}AccreditationRoutes.js`,
  `src/utils/searchTerm.js`, `scripts/testAccreditation.js` (hanya menambah method `ilike` pada fake Supabase; assertion tidak diubah),
  `package.json` (script test), `.env.example` (opsional `ACCREDITATION_TIMEZONE`)
