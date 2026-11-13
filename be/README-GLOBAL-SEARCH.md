# Global Search – Backend WEB UL

Endpoint baru: `GET /api/search?q=kata_kunci&limit=10`

Publik, tanpa login, hanya GET. Mencari ke konten yang sudah dipublikasikan dari 6 sumber dan
mengembalikannya dalam format seragam.

## Lokasi ekstraksi

ZIP ini berisi isi folder `be` (bukan folder `be` itu sendiri). **Ekstrak ke dalam folder `be`**
(folder yang berisi `app.js` dan `package.json`), pilih "Replace" jika diminta untuk `index.js`.

```powershell
cd "D:\diaz\PROJEK UL\WEBUL\be"
Expand-Archive -Path "$HOME\Downloads\global-search-changes.zip" -DestinationPath . -Force
```

Setelah ekstraksi, `app.js`, `.env`, `package.json`, dan seluruh file lama lain tidak tersentuh.

## File baru (5)

| File | Fungsi |
| --- | --- |
| `src/routes/publicSearchRoutes.js` | Route `GET /` + pembatas 60 request/menit + validasi |
| `src/controllers/publicSearchController.js` | Handler tipis, memanggil service |
| `src/services/searchService.js` | Query ke 6 sumber, filter published, penyeragaman hasil, urutan |
| `src/validators/searchValidator.js` | Validasi `q` (2–100 karakter) dan `limit` (1–20, default 10) |
| `scripts/testGlobalSearch.js` | Test offline (Supabase palsu di memori, tanpa jaringan) |

## File lama yang diperbarui (1)

`src/routes/index.js` – hanya 2 tambahan (3 baris termasuk komentar), tidak ada baris lama yang diubah:

```js
const publicSearchRoutes = require("./publicSearchRoutes");   // di bawah require publicAssistantRoutes
...
router.use("/search", publicSearchRoutes);                    // di bawah router.use("/assistant", ...)
```

Jika `index.js` di komputer kamu sudah berubah dibanding versi yang saya terima (misalnya teman
menambah route), **jangan timpa**: cukup tambahkan dua baris di atas secara manual.

## SQL tambahan

**Tidak ada.** Tidak ada tabel/kolom/migrasi baru. Pencarian memakai `ILIKE` pada kolom yang sudah
ada, sama seperti pencarian di modul berita, pengumuman, akreditasi, dan regulasi.

## Sumber yang dicari

| `type` | Tabel | Kolom yang dicari | Filter publik |
| --- | --- | --- | --- |
| `news` | `news` | title, excerpt | status = published dan published_at <= sekarang |
| `announcement` | `announcements` | title, excerpt | status = published dan published_at <= sekarang |
| `academic_calendar` | `academic_calendar_events` | title, description | status = published |
| `accreditation_institution` | `accreditation_institutions` | institution_name, sk_number, rank | published + published_at <= sekarang |
| `accreditation_study_program` | `accreditation_study_programs` | program_name, faculty, sk_number, rank | published + published_at <= sekarang |
| `banpt_regulation` | `banpt_regulations` | regulation_number, title (+ tahun jika q 4 digit) | published + published_at <= sekarang |

Filter di atas sama dengan filter yang dipakai endpoint publik masing-masing modul. Isi artikel
(`content_html`), id admin, status, path/ID file Drive/Storage, dan lampiran tidak pernah di-select.
Assistant Knowledge (khusus admin/AI) dan video tidak ikut dicari.

## Format response

```json
{
  "success": true,
  "data": {
    "query": "akreditasi",
    "total": 7,
    "limit": 10,
    "results": [
      {
        "type": "news",
        "id": "…",
        "title": "Informasi Akreditasi Universitas LIA",
        "slug": "informasi-akreditasi-universitas-lia",
        "excerpt": "Ringkasan informasi",
        "url": "/berita/informasi-akreditasi-universitas-lia",
        "date": "2026-11-11T03:00:00.000Z"
      }
    ]
  }
}
```

- `total` = jumlah semua yang cocok di semua sumber (bisa lebih besar dari `results.length`).
- `results` dibatasi `limit`; judul yang memuat kata kunci diutamakan, lalu yang terbaru.
- `slug` bernilai `null` untuk sumber yang tidak punya slug.
- `partial: true` muncul **hanya** jika sebagian sumber gagal (error Supabase). Hasil dari sumber lain
  tetap dikirim. Jika **semua** sumber gagal: `500` dengan `code: "DATABASE_ERROR"` (pesan umum,
  detail hanya di log server).

Error validasi memakai format lama: `400`, `code: "VALIDATION_ERROR"`, `errors: [...]`.
Rate limit terlampaui: `429`, `code: "TOO_MANY_SEARCH_REQUESTS"`.

## PERLU DICEK: path URL di `url`

Berita (`/berita/:slug`) dan pengumuman (`/pengumuman/:slug`) mengikuti route frontend yang sudah
ada. Sumber lain belum punya halaman detail yang saya ketahui, jadi sementara diarahkan ke halaman
daftar dengan tebakan nama:

- kalender akademik -> `/kalender-akademik`
- akreditasi institusi & prodi -> `/akreditasi`
- regulasi BAN-PT -> `/regulasi-banpt`

Semua ada di satu objek `FRONTEND_PATHS` di bagian atas `src/services/searchService.js`. Sesuaikan
dengan route Next.js yang sebenarnya.

## Cara menjalankan dan menguji

Test otomatis (offline, tidak menyentuh Supabase asli, tidak perlu server jalan):

```powershell
node scripts/testGlobalSearch.js
```

Test manual ke database asli (jalankan server dulu: `npm run dev`), di Thunder Client / browser:

- `GET http://localhost:5000/api/search?q=akreditasi`
- `GET http://localhost:5000/api/search?q=akreditasi&limit=3`
- `GET http://localhost:5000/api/search?q=` -> 400
- `GET http://localhost:5000/api/search?q=a` -> 400 (minimal 2 karakter)
- Buat satu berita **draft** berjudul unik, lalu cari judulnya -> harus `total: 0`.

Catatan: pencarian hanya membaca data (SELECT), tidak ada yang ditulis ke database.

## Batasan yang perlu diketahui

- Hasil pencarian selalu dalam bahasa Indonesia (parameter `lang` belum didukung di `/api/search`;
  terjemahan berita/pengumuman memakai tabel `content_translations` per endpoint).
- Pencarian `ILIKE '%kata%'` tidak memakai index; untuk ukuran data website kampus ini wajar. Jika
  data membesar, index `pg_trgm` bisa ditambahkan nanti (akan saya buatkan SQL terpisah bila perlu).
- Pembatas 60 request/menit disimpan di memori (ter-reset saat server restart). Di frontend, beri
  jeda (debounce) sekitar 300–500 ms saat pengguna mengetik.
