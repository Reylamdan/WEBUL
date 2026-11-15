# Universitas LIA — Frontend

Next.js 16 · React 19 · TypeScript. Terhubung ke backend `UNIVERSITAS-LIA-BE` melalui satu klien API (`lib/api.ts`).

## Menjalankan
```bash
npm install
cp .env.example .env.local     # isi NEXT_PUBLIC_API_URL
npm run dev                    # http://localhost:3000
npm run build && npm start     # produksi
```
Backend harus berjalan lebih dulu, dan `FRONTEND_URL` di `.env` backend harus memuat origin FE ini (CORS).

## Environment
| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_API_URL` | Alamat dasar backend. Satu-satunya sumber base URL (`lib/api.ts`). Gunakan HTTPS di produksi. |

## Arsitektur integrasi
- `lib/api.ts` — klien API, tipe respons, dan objek endpoint (`newsApi`, `announcementApi`, `calendarApi`, `accreditationApi`, `banptRegulationApi`, `searchApi`, `assistantApi`).
- `lib/use-api.ts` — hook `useApi` (loading/error/data) dan `useDebouncedValue`.
- `lib/content-routes.ts` — pemetaan jenis konten backend → halaman FE (satu tempat bila route berubah).
- `lib/use-detail-param.ts` — detail berita/pengumuman dibuka lewat `?baca=<slug>`.
- `components/document-link.tsx` — tombol Lihat/Unduh dokumen dari backend dengan penanganan file tidak ditemukan.

## Pemetaan halaman ↔ endpoint
| Halaman / komponen | Endpoint |
|---|---|
| Beranda: `landing/news-section`, `landing/updates-section` | `GET /api/news`, `/api/announcements`, `/api/academic-calendar` |
| `/kehidupan-kampus/berita-terkini` (+ detail `?baca=`) | `GET /api/news`, `/api/news/:slug` |
| `/kehidupan-kampus/pengumuman`, `/pengumuman` (+ detail `?baca=`) | `GET /api/announcements`, `/api/announcements/:slug` |
| `/akademik/kalender-akademik`, `/kehidupan-kampus/agenda-acara` | `GET /api/academic-calendar`, `/categories` |
| `/profil/akreditasi` (institusi + kartu prodi) | `GET /api/accreditation/institutions`, `/study-programs` |
| `/akademik/akreditasi` (tabel prodi; filter "Terakreditasi" di server via `validUntilFrom`) + Regulasi BAN-PT | `GET /api/accreditation/study-programs`, `/api/banpt-regulations`, `/filter-options` |
| Dokumen SK / regulasi / lampiran | tautan `/api/.../document` dari respons (dialirkan backend; Drive tidak terbuka ke publik) |
| Pencarian global (`components/search`) | `GET /api/search` (konten dinamis) + `search-data.ts` (halaman statis) |
| Virtual Assistant | `POST /api/assistant/chat` |

Halaman tanpa API di backend (profil, PMB, fakultas, kurikulum, LPM, dll.) tetap memakai konten statis.

## Catatan
- Terjemahan: pengalih "Bahasa konten" (Indonesia/English) ada di halaman Berita Terkini dan Pengumuman, preferensi disimpan di perangkat (`lib/content-language.ts`) dan juga berlaku untuk beranda. Hanya konten dinamis (berita/pengumuman) yang diterjemahkan, oleh backend dan hanya yang sudah disetujui admin; sisanya tetap bahasa Indonesia dan ditandai "Indonesian only". Teks antarmuka statis belum diterjemahkan.
- Kategori: daftar kategori dan filter berasal dari backend (`/api/news/categories`, `/api/announcements/categories`).
- Cover berita: gambar dari backend; bila gagal dimuat tampil placeholder bawaan (`components/news-cover.tsx`).
- Rate limit backend: asisten 10 permintaan/15 menit/IP; pencarian 60/menit/IP.
