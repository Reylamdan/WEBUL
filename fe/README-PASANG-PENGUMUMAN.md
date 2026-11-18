# Halaman Admin Pengumuman

Semua file BARU. Tidak ada file lama yang diubah, dan backend tidak disentuh.
Ekstrak ke folder `fe` (struktur folder sudah sama):

- lib/announcement-admin-api.ts
- components/admin/rich-text-editor.tsx   (editor isi, dipakai bersama)
- components/admin/pengumuman/pengumuman-admin.tsx
- app/admin/kehidupan-kampus/pengumuman/page.tsx

Halaman: /admin/kehidupan-kampus/pengumuman (menu "Pengumuman" di sidebar sudah mengarah ke sini).
Memakai gaya dari components/admin/berita-terkini/berita-admin.css (sudah ada dari commit sebelumnya).

Endpoint: GET/POST /api/admin/announcements, GET/PATCH/DELETE /api/admin/announcements/:id,
GET /api/announcements/categories.

Cek: `npx tsc --noEmit` lolos. Belum diuji manual di browser dengan backend sungguhan.
