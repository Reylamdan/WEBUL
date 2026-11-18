# Halaman Admin Berita Terkini

Semua file BARU. Tidak ada file lama yang diubah, dan backend tidak disentuh.

Ekstrak ke folder `fe` (struktur folder sudah sama):

- lib/news-admin-api.ts
- components/admin/berita-terkini/berita-admin.tsx
- components/admin/berita-terkini/berita-admin.css
- app/admin/kehidupan-kampus/berita-terkini/page.tsx

Halaman: /admin/kehidupan-kampus/berita-terkini (menu "Berita Terkini" di sidebar sudah mengarah ke sini).

Endpoint yang dipakai (semua sudah ada di backend):
GET/POST /api/admin/news, GET/PATCH/DELETE /api/admin/news/:id,
PUT/DELETE /api/admin/news/:id/cover, GET /api/news/categories.

Cek: `npx tsc --noEmit` lolos. Belum diuji manual di browser dengan backend sungguhan.
