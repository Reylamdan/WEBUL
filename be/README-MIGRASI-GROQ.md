# Migrasi Provider Terjemahan: Gemini -> Groq

Backend Universitas LIA. Tanggal pengerjaan: 4 November 2026.

Provider AI penerjemahan sekarang **Groq** (`groq-sdk`, sudah terpasang di project). Fitur terjemahan yang
sudah ada (preview -> approval admin -> simpan ke `content_translations` -> dipakai pengunjung lewat
`?lang=en`) **tidak dibangun ulang**; hanya provider di belakangnya yang diganti.

## 1. Lokasi extract dan pemasangan

1. Extract ZIP **langsung ke folder backend**: `D:\diaz\PROJEK UL\WEBUL\be`
   (isi ZIP sudah berstruktur `src\`, `scripts\`, dst., tanpa folder pembungkus). Pilih "Replace" untuk file
   yang sudah ada.
2. Tidak perlu `npm install`: `groq-sdk@1.6.0` sudah terpasang dan `package.json` / `package-lock.json`
   tidak diubah.
3. Tambahkan variabel di file `.env` Anda sendiri (lihat bagian 3). `.env` tidak ada di ZIP dan tidak disentuh.
4. Jalankan test (bagian 4), lalu restart server (`npm run dev`).

## 2. Daftar file

### Dibuat (baru)

| File | Fungsi |
| --- | --- |
| `src/services/translationProvider.js` | Fasad provider-neutral. Kontrak tetap `translateFields` dan `isConfigured`. Memilih provider dari `TRANSLATION_PROVIDER`. |
| `src/services/groqTranslator.js` | Service Groq: satu panggilan per request, structured output, retry hanya untuk 503, pemetaan error aman, API key disamarkan di log. |
| `src/services/translationCommon.js` | Bagian yang sama untuk semua provider: system prompt, pemilihan field, skema JSON, validasi & sanitasi keluaran (struktur HTML, href, nama resmi). |
| `scripts/testTranslationGroq.js` | 67 pengujian offline (lihat bagian 4). |
| `README-MIGRASI-GROQ.md` | Dokumen ini. |

### Diubah

| File | Perubahan |
| --- | --- |
| `src/config/env.js` | Menambah `GROQ_API_KEY`, `GROQ_MODEL` (validasi format), dan `TRANSLATION_PROVIDER` (`groq` default, atau `gemini`). Konfigurasi Gemini tidak diubah. |
| `src/controllers/adminTranslationController.js` | Memakai `translationProvider` (bukan `geminiTranslator`); pesan "belum dikonfigurasi" mengikuti provider; kolom `provider` disimpan sebagai `groq:<model>`. Logika preview/approval/simpan/hapus tidak berubah. |
| `src/validators/translationValidator.js` | Field `model` pada approval sebelumnya hanya menerima `gemini-*-flash`, sehingga approval hasil Groq akan **ditolak 400**. Regex dilonggarkan ke format ID model umum (mis. `openai/gpt-oss-120b`), model Gemini lama tetap valid. |
| `.env.example` | Menambah blok `TRANSLATION_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL` (tanpa nilai rahasia). |

### Sengaja TIDAK diubah

- `src/services/geminiTranslator.js` dan paket `@google/genai`: dipertahankan untuk rollback sampai Anda yakin.
- `package.json`, `package-lock.json`, `app.js`.
- Autentikasi: `requireAdmin.js`, `token.js`, `authController.js`, rute auth.
- `src/routes/adminTranslationRoutes.js` dan `src/middleware/translationLimiter.js` (6 request/menit, sudah
  sesuai batas Groq 30 RPM; hanya komentarnya masih menyebut Gemini).
- `src/services/translationStore.js`, `src/middleware/withTranslation.js` (terjemahan tersimpan dipakai
  pengunjung tanpa memanggil AI).
- `src/middleware/errorHandler.js`: sudah diperiksa, tidak ada perubahan yang diperlukan (lihat bagian 6).
- Fitur berita, pengumuman, akreditasi, regulasi BAN-PT, seluruh endpoint publik, skema database, frontend.
- `scripts/testTranslation.js` dan `scripts/testTranslationStore.js`: tetap valid (menguji service Gemini
  yang dipertahankan dan penyimpanan/penggabungan terjemahan).

## 3. Konfigurasi `.env` (placeholder)

```env
# Provider terjemahan aktif: groq (default) atau gemini (rollback). TIDAK ada perpindahan otomatis.
TRANSLATION_PROVIDER=groq

# API key dari https://console.groq.com/keys (jangan masuk frontend / git)
GROQ_API_KEY=isi_dengan_api_key_groq_anda
# Model Groq. Rekomendasi:
GROQ_MODEL=openai/gpt-oss-120b

# Konfigurasi Gemini dibiarkan seperti sekarang selama masa migrasi
# GEMINI_API_KEY=...
# GEMINI_MODEL=...
```

**Penting:** `GROQ_MODEL` wajib diisi. Tanpa itu, endpoint preview menjawab `503 TRANSLATION_NOT_CONFIGURED`
(sama seperti desain Gemini: tidak ada model bawaan, supaya tidak ada pergantian model diam-diam).

### Alasan memilih `openai/gpt-oss-120b`

Diperiksa dari dokumentasi resmi Groq pada 4 November 2026
(`console.groq.com/docs/models`, `/docs/rate-limits`, `/docs/structured-outputs`):

- Terdaftar sebagai model **Production** (bukan Preview), harga berbayar hanya berlaku bila Anda menambah
  metode pembayaran; tanpa itu akun tetap di Free plan.
- Free plan: 30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD.
- Mendukung Structured Outputs mode `strict` (constrained decoding), sehingga keluaran JSON selalu sesuai skema.
- `llama-3.3-70b-versatile` dan `llama-3.1-8b-instant` saat ini tercantum "Enterprise / Contact Sales" di
  tabel model, jadi tidak dipilih.

Daftar model bisa berubah. Untuk memastikan ID model yang aktif untuk akun Anda (PowerShell, hanya mencetak ID):

```powershell
(Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/models" -Headers @{ Authorization = "Bearer $env:GROQ_API_KEY" }).data.id
```

(Set dulu `$env:GROQ_API_KEY` di sesi PowerShell itu; jangan menempelkan key ke chat atau file.)

## 4. Pengujian

Jalankan dari folder backend (PowerShell):

```powershell
cd "D:\diaz\PROJEK UL\WEBUL\be"

# Test baru: provider Groq + alur admin + akses pengunjung (offline)
node scripts/testTranslationGroq.js

# Test translation yang sudah ada (offline)
node scripts/testTranslation.js
node scripts/testTranslationStore.js

# Regresi test offline lain (opsional)
node scripts/testAccreditation.js
node scripts/testAccreditationSearch.js
node scripts/testBanptRegulation.js
```

Semua test di atas **offline**: Groq diganti server HTTP tiruan lokal (SDK `groq-sdk` yang asli tetap
dipakai), Supabase diganti database palsu di memori, dan env dipaksa ke nilai uji. Tidak ada API key asli,
kuota, maupun data Supabase yang tersentuh. `testNews`, `testPublicNews`, `testAnnouncement`, `testCover`
memerlukan server hidup + login admin ke database asli, jadi **tidak dijalankan**.

### Hasil yang benar-benar dijalankan (4 November 2026, Node v22)

| Script | Hasil |
| --- | --- |
| `testTranslationGroq.js` (baru) | 67 lulus, 0 gagal |
| `testTranslation.js` | 31 lulus, 0 gagal |
| `testTranslationStore.js` | 12 lulus, 0 gagal |
| `testAccreditation.js` | 91 lulus, 0 gagal |
| `testAccreditationSearch.js` | 49 lulus, 0 gagal |
| `testBanptRegulation.js` | 58 lulus, 0 gagal |

Pemetaan ke 11 butir yang diminta pada `testTranslationGroq.js`:

1. Groq menerjemahkan teks: bagian "1" (termasuk SDK asli -> server tiruan, header, body).
2. Beberapa field sekaligus: bagian "2" (satu panggilan untuk title + excerpt + contentHtml).
3. Struktur HTML: bagian "3" (tag, nesting, href; keluaran disanitasi; nama resmi dijaga).
4. Keluaran kosong/tidak valid ditolak: bagian "4" (bukan JSON, field hilang/kosong, kosong setelah sanitasi, terpotong, dst.).
5. API key tidak valid: bagian "5" (401/403/400/404/422; key tidak bocor di pesan maupun log).
6. Rate limit/kuota: bagian "6" (429 -> tepat 1 request, tanpa retry/fallback; 413).
7. Timeout/unavailable: bagian "7" (503 retry maks. 3x, timeout SDK asli, koneksi putus, 500).
8. Admin preview berhasil: "HTTP: alur admin" (entity dan fields; tidak menyimpan apa pun).
9. Approval & simpan: "HTTP: alur admin" (PUT, provider `groq:<model>`, 409 saat sumber berubah).
10. Pengunjung tidak bisa akses endpoint admin: "HTTP: autentikasi admin" (401/403 di keempat endpoint; Groq tidak dipanggil).
11. Pengunjung mengambil terjemahan tersimpan: "HTTP: pengunjung" (tanpa panggilan AI; usang -> Indonesia).

Sebagai uji ketahanan, test sempat diuji dengan merusak kode sengaja (mematikan `maxRetries: 0`, penyamaran
key, pemeriksa struktur HTML, `requireAdmin`, dan penyembunyian stack di produksi); setiap kerusakan terdeteksi
oleh test yang relevan, lalu kode dipulihkan.

### Yang BELUM diuji

- **Panggilan ke `api.groq.com` yang sungguhan.** Lingkungan pengerjaan tidak mengakses Groq dan API key Anda
  sengaja tidak dipakai. Belum terbukti dengan akun Anda: model aktif, penerimaan parameter
  (`response_format` strict, `reasoning_effort: "low"`, `include_reasoning: false`), kualitas terjemahan, dan
  batas kuota riil. Lakukan uji manual (bagian 5) sebelum production.
- Constraint/trigger Supabase asli (database palsu meniru struktur dari komentar di `translationStore.js`).

## 5. Uji manual dengan Groq asli (disarankan)

1. Isi `.env` (bagian 3), restart server.
2. Login admin lewat frontend, lalu buat preview untuk satu berita pendek. Atau PowerShell:

```powershell
$base = "http://localhost:5000"
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" `
  -Body (@{ email = "EMAIL_ADMIN"; password = "PASSWORD_ADMIN" } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.data.token)" }

Invoke-RestMethod -Method Post -Uri "$base/api/admin/translations/preview" -Headers $headers `
  -ContentType "application/json" `
  -Body (@{ fields = @{ judul = @{ kind = "text"; value = "Selamat datang di Universitas LIA" } } } | ConvertTo-Json -Depth 5)
```

3. Jika gagal, lihat log server: baris `[GROQ] permintaan gagal: ... (status: NNN)` memuat pesan Groq
   (API key disamarkan). Status 400 biasanya berarti ID model atau salah satu parameter ditolak.

## 6. Catatan keamanan dan perilaku

- API key hanya dibaca di backend, tidak pernah ada di respons, pesan error, maupun log (disamarkan).
- Endpoint terjemahan tetap di balik `requireAdmin` + `translationLimiter`. Penerjemahan hanya terjadi saat
  admin meminta preview; menyimpan dan membaca terjemahan tidak memanggil AI.
- Tidak ada fallback otomatis ke provider/model lain. Kuota habis = error 429 yang jelas.
- Retry bawaan SDK dimatikan (`maxRetries: 0`); retry dilakukan sendiri, hanya untuk 503 (maks. 3 percobaan).
- Pemeriksaan tambahan pada hasil terjemahan Groq (ditolak dengan 502 bila gagal): urutan tag HTML dan
  seluruh `href` harus sama dengan sumber; nama resmi (Universitas LIA, STIA LIA, SIAKAD UL, Edlink, LPPM,
  LPM, UKM, PMB) yang ada di sumber harus tetap ada. Admin cukup menekan preview lagi bila ini terjadi.
- **Error handler:** diperiksa, di `NODE_ENV=production` stack trace dan detail internal tidak dikirim ke
  klien (teruji). Namun `NODE_ENV` yang tidak diisi dianggap `development` dan **akan mengirim stack trace**.
  Pastikan server production menetapkan `NODE_ENV=production`.

## 7. Batasan yang perlu Anda ketahui

- **Free tier Groq dibatasi 8.000 token per menit** untuk model ini. Berita yang panjang bisa gagal
  (`413 TRANSLATION_TOO_LARGE`, `422 TRANSLATION_TOO_LONG`, atau `429` kuota). Batas keluaran di kode:
  `MAX_COMPLETION_TOKENS = 4096` (konstanta di `groqTranslator.js`). Validator kita masih mengizinkan
  isi sampai 200.000 karakter, yang jelas tidak muat di free tier; untuk berita panjang, terjemahkan per bagian
  atau pertimbangkan Developer plan.
- Kolom `content_translations.provider` kini berisi mis. `groq:openai/gpt-oss-120b` (ada tanda `/`).
  Skema database tidak diubah dan saya tidak bisa memeriksa constraint pada kolom itu; bila ada CHECK yang
  membatasi format, simpan akan gagal. Cek pada uji manual langkah approval.
- Frontend admin harus mengirim kembali nilai `model` dari respons preview saat approval (perilaku yang
  sudah ada), tidak perlu perubahan.

## 8. Rollback dan pembersihan nanti

- Rollback cepat tanpa mengubah kode: set `TRANSLATION_PROVIDER=gemini` di `.env`, restart.
- Setelah Groq terbukti stabil di production: hapus `geminiTranslator.js`, entri `gemini` di
  `translationProvider.js` dan `env.js`, paket `@google/genai`, serta variabel `GEMINI_*`; sesuaikan
  `testTranslation.js` yang masih menguji service Gemini.
