# Manajemen Peraturan BAN-PT (backend)

Tidak ada migration/SQL baru dan tidak ada perubahan database. Memakai tabel `banpt_regulations`
dan bucket publik `banpt-regulations` yang sudah Anda siapkan. Fitur akreditasi tidak diubah.

## Endpoint

Publik (tanpa login, hanya `published` dan `published_at <= sekarang`):

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/banpt-regulations` | Daftar + filter + pagination |
| GET | `/api/banpt-regulations/filter-options` | Daftar tahun untuk dropdown |
| GET | `/api/banpt-regulations/:id` | Detail |

Admin (semua di bawah `requireAdmin`, Bearer token):

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/banpt-regulations` | Daftar (termasuk draft), tambahan filter `status` |
| GET | `/api/admin/banpt-regulations/filter-options` | Tahun dari semua data |
| GET | `/api/admin/banpt-regulations/:id` | Detail |
| POST | `/api/admin/banpt-regulations` | Buat (JSON), selalu mulai tanpa file |
| PATCH | `/api/admin/banpt-regulations/:id` | Ubah nomor/tahun/tanggal/judul/status (JSON) |
| DELETE | `/api/admin/banpt-regulations/:id` | Hapus data + dokumen utama + semua lampiran |
| PUT | `/api/admin/banpt-regulations/:id/document` | Unggah/ganti dokumen utama (multipart, field `document`) |
| POST | `/api/admin/banpt-regulations/:id/attachments` | Tambah 1-5 lampiran (multipart, field `attachments`) |
| PUT | `/api/admin/banpt-regulations/:id/attachments/:attachmentId` | Ganti satu lampiran (multipart, field `attachment`) |
| DELETE | `/api/admin/banpt-regulations/:id/attachments/:attachmentId` | Hapus satu lampiran |

Pola upload mengikuti akreditasi: data dibuat dulu lewat JSON, file diunggah lewat endpoint terpisah.

Body POST: `{ "regulationNumber": "1", "regulationYear": 2024, "determinationDate": "2024-03-01", "title": "...", "status": "draft" }`
(`status` opsional, default `draft`). Status `published` hanya bisa diset setelah dokumen utama ada.

## Query daftar

`page`, `limit` (1-50, default 10), `search` (nomor, judul, dan tahun bila 4 digit), `year` (`2024`),
`regulationNumber` (sebagian kata), `dateFrom`, `dateTo` (`YYYY-MM-DD`, inklusif, pada tanggal penetapan),
`status` (admin saja). Semua bisa digabung. Urutan: tanggal penetapan terbaru.

## Bentuk respons

```
{ success, data: { items: [ { id, regulationNumber, regulationYear, determinationDate, title,
    document: { mimeType, url, downloadUrl } | null,
    attachments: [ { id, name, mimeType, size, uploadedAt, url, downloadUrl } ],
    publishedAt, (admin: status, createdAt, updatedAt) } ],
  pagination: { page, limit, total, totalPages } } }
```
Detail: `data.regulation`. Path storage tidak pernah dikirim sebagai field.

## Aturan file
Hanya PDF (MIME + ekstensi + isi `%PDF-`), maks 20 MB per file, maks 5 file per request, maks 20 lampiran per peraturan.
Path dibuat server: `regulations/<id>/main/<uuid>.pdf` dan `regulations/<id>/attachments/<uuid>.pdf`.
Penggantian: upload baru -> update DB (compare-and-set) -> hapus file lama. Gagal di tengah = file baru dibersihkan.
Kegagalan menghapus file dicatat `[ORPHAN]` di log server.

## Struktur JSON `attachments` (ditentukan backend)
`[{ "id": "uuid", "name": "Nama asli.pdf", "path": "regulations/.../attachments/<uuid>.pdf", "mimeType": "application/pdf", "size": 12345, "uploadedAt": "ISO" }]`

## Test
```
npm run test:banpt-regulation        # baru, 58 test
npm run test:accreditation           # 91 test
npm run test:accreditation-search    # 49 test
```
Semua offline dengan Supabase palsu; tidak menyentuh data asli.
