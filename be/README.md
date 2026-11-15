# Universitas LIA — Backend

Express 5 · Supabase · JWT. Pasangan versi dengan `UNIVERSITAS-LIA-FE`.

## WAJIB sebelum menjalankan versi ini: migrasi database
Berita dan pengumuman kini memiliki kolom `category`. Jalankan `supabase/migrations/20261115_add_category_news_announcements.sql`
di Supabase (SQL Editor) **sebelum** deploy, kalau tidak endpoint berita/pengumuman akan error karena kolom belum ada.
Data lama tetap aman (kategori = kosong). Daftar kategori ada di `src/utils/contentCategories.js` (tanpa perlu migrasi untuk menambah).

## Menjalankan
```bash
npm install
cp .env.example .env     # isi variabel wajib
npm run dev              # http://localhost:5000
```
Variabel wajib: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (≥32 karakter), `FRONTEND_URL` (origin FE, dipisah koma bila lebih dari satu; wajib di produksi).
Opsional: `GROQ_*`/`GEMINI_*` (terjemahan & asisten), `GOOGLE_*` (dokumen di Google Drive), `BACKEND_PUBLIC_URL` (wajib bila FE dan API beda domain). Lihat `.env.example`.

## Endpoint publik yang dipakai FE
`GET /api/news` (`?category=&lang=en`), `/api/news/categories`, `/api/news/:slug` · `GET /api/announcements` (`?category=&lang=en`), `/categories`, `/:slug` · `GET /api/academic-calendar`, `/categories` ·
`GET /api/accreditation/institutions`, `/study-programs`, `/study-programs/:id/document` ·
`GET /api/banpt-regulations`, `/filter-options`, `/:id/document`, `/:id/attachments/:attachmentId` ·
`GET /api/search?q=&limit=` · `POST /api/assistant/chat` (`{ question, history[] }`).

Endpoint admin (`/api/admin/*`, `/api/auth`) tidak diubah dan tetap dilindungi `requireAdmin`.

Pengujian per modul: lihat skrip `test:*` di `package.json` dan folder `scripts/`. Panduan pencarian: `README-GLOBAL-SEARCH.md`.
