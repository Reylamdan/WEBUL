# Halaman Admin Akreditasi

Route: /admin/profil/akreditasi (menu "Akreditasi" di sidebar sudah ada di admin-nav-data.ts, jadi tidak ada file yang perlu diubah).

## File baru (extract ke folder fe, struktur folder sudah sesuai)
- lib/accreditation-admin-api.ts
- components/admin/akreditasi/akreditasi-admin.tsx
- app/admin/profil/akreditasi/page.tsx

Tidak ada file lama yang diubah. Backend, database, dan .env tidak disentuh.

## Pasang (PowerShell, dari folder fe)
Expand-Archive -Path .\akreditasi-admin.zip -DestinationPath . -Force
npx tsc --noEmit
npm run dev

## Fitur
- Dua tab: Akreditasi Institusi dan Akreditasi Program Studi
- Daftar + pencarian + pagination; filter status; filter prodi: jenjang, peringkat, masa berlaku
- Tambah / edit / hapus; toggle Terbitkan / Jadikan Draf
- Badge masa berlaku (aktif, segera berakhir <= 90 hari, kedaluwarsa)
- Unggah, ganti, lihat, unduh, dan hapus dokumen SK (PDF/JPEG/PNG, maks 10 MB)

## Endpoint yang dipakai (semua sudah ada di BE)
/api/admin/accreditation/institutions dan /study-programs (GET, POST, PATCH /:id, DELETE /:id, PUT dan DELETE /:id/document), serta GET /study-programs/filter-options

## Push (git add per file)
git add lib/accreditation-admin-api.ts
git add components/admin/akreditasi/akreditasi-admin.tsx
git add app/admin/profil/akreditasi/page.tsx
