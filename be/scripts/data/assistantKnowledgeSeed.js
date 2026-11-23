// Data awal Assistant Knowledge, disusun dari konten halaman frontend Universitas LIA (folder fe).
//
// Aturan penyusunan:
// - Hanya memuat informasi yang tertulis di halaman website. Tidak ada biaya, jadwal, atau angka yang dikarang.
// - Biaya kuliah, jadwal gelombang, kalender akademik, berita, pengumuman, dan akreditasi dikelola di modulnya
//   masing-masing (database), jadi hanya diberi petunjuk halaman di sini, bukan angka.
// - Setiap item mengikuti batas validator createKnowledgeSchema (judul 200, kategori 60, isi 10.000,
//   keyword maks. 20 @ 50 karakter, sourcePath berupa path yang diawali satu "/").
// - Judul bersifat unik: seed memakai pasangan (judul, kategori) untuk mengenali item yang sudah ada.

const CONTACT_PATH = "/";

const entries = [
  // ------------------------------------------------------------------ PROFIL
  {
    title: "Profil Universitas LIA",
    category: "Profil",
    content: `Universitas LIA adalah perguruan tinggi yang menghubungkan bidang bahasa, humaniora, desain, sains, dan bisnis dalam satu lingkungan belajar. Perjalanan institusi ini berangkat dari pengalaman STIA LIA dalam menghadirkan pendidikan tinggi dengan perhatian pada bidang bahasa, lalu berkembang menjadi Universitas LIA.

Universitas LIA memiliki dua fakultas: Fakultas Humaniora dan Desain (bahasa, budaya, dan kreativitas visual) serta Fakultas Sains dan Bisnis (teknologi, informasi, dan bisnis digital). Program yang tersedia mencakup jenjang Diploma (D3) dan Sarjana (S1).

Alamat kampus: Jl. Pengadegan Timur Raya No.3. Situs resmi: https://www.universitaslia.ac.id. Halaman Profil di website memuat sejarah, visi dan misi, struktur organisasi, akreditasi, fasilitas kampus, serta unit dan bagian.`,
    keywords: ["profil", "tentang universitas lia", "universitas lia", "kampus lia", "apa itu lia", "stia lia", "tentang kampus", "kampus", "universitas", "pengenalan kampus", "about", "perkenalan"],
    sourceLabel: "Halaman Profil",
    sourcePath: "/profil",
  },
  {
    title: "Sejarah Universitas LIA",
    category: "Profil",
    content: `Sejarah Universitas LIA di website dirangkum dalam empat tahap perjalanan:
1. Awal perjalanan: berangkat dari pengalaman STIA LIA dalam menghadirkan pendidikan tinggi dengan perhatian pada bidang bahasa.
2. Bertumbuh bersama kebutuhan: cakupan pembelajaran terus berkembang mengikuti kebutuhan ilmu, keterampilan, dan dunia kerja.
3. Transformasi institusi: perjalanan berlanjut melalui transformasi menjadi Universitas LIA dan pengembangan bidang studi.
4. Universitas LIA hari ini: menghubungkan bahasa, humaniora, desain, sains, dan bisnis dalam lingkungan belajar yang terus bertumbuh.

Halaman Sejarah tidak mencantumkan tahun pendirian atau tanggal tertentu, sehingga informasi tersebut tidak dapat dipastikan dari sumber ini.`,
    keywords: ["sejarah", "riwayat", "perjalanan", "berdiri", "pendirian", "stia lia", "sejarah kampus", "kapan berdiri", "asal usul", "transformasi", "history"],
    sourceLabel: "Halaman Sejarah",
    sourcePath: "/profil/sejarah",
  },
  {
    title: "Visi, Misi, dan Komitmen Universitas LIA",
    category: "Profil",
    content: `Menurut halaman Visi & Misi Universitas LIA:
- Visi: menjadi arah bersama dalam membangun pendidikan yang relevan, terbuka, dan berorientasi pada masa depan.
- Misi: menghadirkan pengalaman belajar yang mendorong penguasaan ilmu, kreativitas, dan kesiapan berkarya.

Landasan: nilai pendidikan, pengembangan potensi, dan kesiapan menghadapi perubahan menjadi landasan perjalanan akademik.

Komitmen (nilai institusi):
- Pendidikan: komitmen terhadap mutu pembelajaran.
- Pengembangan: dukungan terhadap kompetensi dan potensi mahasiswa.
- Kolaborasi: mendorong kerja sama dan lingkungan akademik yang terbuka.`,
    keywords: ["visi", "misi", "visi misi", "tujuan", "komitmen", "nilai institusi", "landasan", "arah kampus", "vision", "mission"],
    sourceLabel: "Halaman Visi & Misi",
    sourcePath: "/profil/visi-misi",
  },
  {
    title: "Laporan Tahunan Rektor",
    category: "Profil",
    content: `Universitas LIA mempublikasikan arsip Laporan Tahunan Rektor setiap tahun. Halaman Laporan Tahunan Rektor di website menyediakan dokumen laporan tahun 2024 dan tahun 2025 yang dipublikasikan melalui situs resmi universitas. Dokumen dapat dibuka langsung dari halaman tersebut.`,
    keywords: ["laporan tahunan rektor", "laporan rektor", "laporan tahunan", "rektor", "annual report", "laporan 2024", "laporan 2025"],
    sourceLabel: "Halaman Laporan Tahunan Rektor",
    sourcePath: "/laporan-tahunan-rektor",
  },

  // ---------------------------------------------------------------- AKADEMIK
  {
    title: "Fakultas dan Program Studi di Universitas LIA",
    category: "Akademik",
    content: `Universitas LIA memiliki dua fakultas dengan program studi berikut:

Fakultas Humaniora dan Desain (bahasa, budaya, dan kreativitas visual):
- D3 Bahasa Inggris
- S1 Bahasa Inggris
- S1 Bahasa Jepang
- S1 Desain Komunikasi Visual (DKV)

Fakultas Sains dan Bisnis (teknologi, informasi, dan bisnis digital):
- S1 Bisnis Digital
- S1 Informatika
- S1 Sistem Informasi

Total ada tujuh program studi (satu Diploma dan enam Sarjana). Rincian tiap program studi tersedia di halaman Fakultas dan halaman masing-masing program studi.`,
    keywords: ["fakultas", "program studi", "prodi", "jurusan", "jurusan apa saja", "prodi apa saja", "daftar prodi", "humaniora dan desain", "sains dan bisnis", "d3", "s1", "diploma", "sarjana"],
    sourceLabel: "Halaman Fakultas dan Program Studi",
    sourcePath: "/akademik/fakultas",
  },
  {
    title: "Kurikulum dan pendekatan pembelajaran (OBE)",
    category: "Akademik",
    content: `Halaman Kurikulum Universitas LIA menjelaskan pendekatan, struktur, dan arah pembelajaran. Pendekatan yang dipakai adalah Outcome-Based Education (OBE): capaian pembelajaran menjadi arah perancangan mata kuliah, dan kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang dibutuhkan lulusan.

Halaman tersebut juga memuat tabel komponen pembelajaran tiap program studi. Rincian mata kuliah dapat berbeda menurut program studi dan periode kurikulum, sehingga untuk daftar mata kuliah lengkap perlu merujuk dokumen kurikulum resmi program studi.`,
    keywords: ["kurikulum", "obe", "outcome based education", "mata kuliah", "capaian pembelajaran", "struktur kurikulum", "komponen pembelajaran", "matkul", "silabus"],
    sourceLabel: "Halaman Kurikulum",
    sourcePath: "/akademik/kurikulum",
  },

  // ------------------------------------------------------------ PROGRAM STUDI
  {
    title: "Program Studi D3 Bahasa Inggris",
    category: "Program Studi",
    content: `D3 Bahasa Inggris (Diploma, Fakultas Humaniora dan Desain) adalah pendidikan vokasi yang mengembangkan keterampilan menyimak, membaca, berbicara, dan menulis serta penguasaan tata bahasa Inggris. Pembelajaran diarahkan pada penerapan bahasa dalam situasi kerja pariwisata dan industri pariwisata.

Tujuan pendidikan vokasi: mengembangkan kompetensi berbahasa Inggris, kreativitas, inovasi, dan jiwa wirausaha, serta kemampuan berpikir kritis dan sistematis.

Profil lulusan yang dipublikasikan: Copywriter, Public Relation, Customer Service, Announcer, Finance Admin, Call Center, dan Secretary. Profil ini mengacu pada halaman resmi program studi dan bukan jaminan pekerjaan.

Akreditasi menurut halaman program studi: Terakreditasi, berdasarkan SK 355/SK/BAN-PT/Ak.P/D3/IV/2024 dengan peringkat Baik dan masa penilaian sampai Maret 2029. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["d3 bahasa inggris", "diploma bahasa inggris", "d3 bing", "bahasa inggris d3", "prodi bahasa inggris", "pariwisata", "vokasi", "lulusan d3", "prospek kerja d3", "akreditasi d3"],
    sourceLabel: "Halaman D3 Bahasa Inggris",
    sourcePath: "/akademik/programstudi/humanioradesain/d3-bing",
  },
  {
    title: "Program Studi S1 Bahasa Inggris",
    category: "Program Studi",
    content: `S1 Bahasa Inggris (Sarjana, Fakultas Humaniora dan Desain) mengembangkan empat keterampilan berbahasa, yaitu menyimak, membaca, berbicara, dan menulis, disertai penguasaan tata bahasa. Peminatan mencakup terjemahan, pengajaran, dan pariwisata.

Pembelajaran mengembangkan kompetensi penerjemahan dan pengajaran, kemampuan berpikir kritis, serta pemahaman linguistik terapan.

Profil lulusan yang dipublikasikan: Writer, Blogger, Advertising Executive, Tour Guide, Lecturer, Diplomatic Staff, Translator, Entrepreneur, dan Interpreter. Profil ini mengacu pada halaman resmi program studi dan bukan jaminan pekerjaan.

Akreditasi menurut halaman program studi: Baik Sekali. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["s1 bahasa inggris", "sarjana bahasa inggris", "s1 bing", "sastra inggris", "bahasa inggris s1", "penerjemahan", "translator", "pengajaran", "linguistik", "prospek kerja bahasa inggris"],
    sourceLabel: "Halaman S1 Bahasa Inggris",
    sourcePath: "/akademik/programstudi/humanioradesain/s1-bing",
  },
  {
    title: "Program Studi S1 Bahasa Jepang",
    category: "Program Studi",
    content: `S1 Bahasa Jepang (Sarjana, Fakultas Humaniora dan Desain) mengembangkan keterampilan berbahasa Jepang dengan pemahaman budaya dan etika bisnis Jepang. Mahasiswa dapat mendalami peminatan penerjemahan atau pariwisata.

Kompetensi bahasa yang dipublikasikan mengacu pada kemampuan setingkat JLPT N3/N2. Hal ini bukan jaminan sertifikasi JLPT.

Contoh mata kuliah: Tata Bahasa; Membaca & Menulis Kanji; Fononorfologi Jepang; Sintaksis Jepang; Semantik Bahasa Jepang; Pengantar Penerjemahan; Bahasa Jepang Bisnis; Korespondensi Jepang.

Profil lulusan yang dipublikasikan: Interpreter bahasa Jepang, Wirausaha, Tour Guide, Editor, dan Penulis. Profil ini mengacu pada halaman resmi program studi dan bukan jaminan pekerjaan.

Akreditasi menurut halaman program studi: B. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["s1 bahasa jepang", "sastra jepang", "bahasa jepang", "jepang", "jlpt", "n3", "n2", "kanji", "s1 bjepang", "nihongo", "prospek kerja bahasa jepang"],
    sourceLabel: "Halaman S1 Bahasa Jepang",
    sourcePath: "/akademik/programstudi/humanioradesain/s1-bjepang",
  },
  {
    title: "Program Studi S1 Desain Komunikasi Visual (DKV)",
    category: "Program Studi",
    content: `S1 Desain Komunikasi Visual (DKV, Sarjana, Fakultas Humaniora dan Desain) mengembangkan kreativitas, estetika, dan kemampuan komunikasi visual dalam berbagai media. Pembelajaran mencakup teknologi informasi dan komunikasi, wawasan global, bahasa asing, serta kewirausahaan. Semboyan yang tercantum: U.P.B.A.N (Upaya, Rasa, Budaya, Akhlak, Negeri).

Contoh mata kuliah: Dasar-Dasar Menggambar; Tipografi Nusantara; Dasar-Dasar Fotografi; Teori Visual; Nirmana; Ilustrasi; Semiotika Visual; Riset Desain. Mata kuliah lanjutan mencakup Prinsip Desain UI/UX, Desain Kemasan, Media Baru Digital, dan Desain Situs Web.

Profil lulusan yang dipublikasikan: Desainer Buku, Ilustrator, Graphic designer, Motion designer, Video editor, dan Animator. Profil ini mengacu pada halaman resmi program studi dan bukan jaminan pekerjaan.

Akreditasi menurut halaman program studi: Terakreditasi Sementara. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["dkv", "desain komunikasi visual", "s1 dkv", "desain grafis", "graphic design", "ilustrasi", "animasi", "desain", "ui ux", "motion design", "prospek kerja dkv"],
    sourceLabel: "Halaman S1 Desain Komunikasi Visual",
    sourcePath: "/akademik/programstudi/humanioradesain/s1-dkv",
  },
  {
    title: "Program Studi S1 Bisnis Digital",
    category: "Program Studi",
    content: `S1 Bisnis Digital (Sarjana, Fakultas Sains dan Bisnis) mempelajari bisnis berbasis teknologi, pemasaran digital, e-commerce, analitik data, dan inovasi digital, dipadukan dengan manajemen dan bahasa asing. Fokus pembelajaran menghubungkan pemahaman bisnis dengan penerapan teknologi dan inovasi digital.

Contoh mata kuliah: Pengantar Bisnis Digital; Statistika Bisnis dan Ekonomi; Akuntansi Bisnis; Komunikasi Bisnis dan Negosiasi; Pemasaran Digital; Transaksi Digital dan Teknologi Keuangan; Design Thinking; E-commerce.

Profil lulusan yang dipublikasikan: Business Consultant, Market Researcher, Technopreneur, Social Media Specialist, Digital Marketing Specialist, dan Financial Technology Analyst.

Akreditasi menurut halaman program studi: Baik. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["bisnis digital", "s1 bisnis digital", "digital marketing", "e-commerce", "ecommerce", "pemasaran digital", "technopreneur", "fintech", "bisdig", "prospek kerja bisnis digital"],
    sourceLabel: "Halaman S1 Bisnis Digital",
    sourcePath: "/akademik/programstudi/sainsdanbisnis/s1-bisnis-digital",
  },
  {
    title: "Program Studi S1 Informatika",
    category: "Program Studi",
    content: `S1 Informatika (Sarjana, Fakultas Sains dan Bisnis) mempelajari ilmu komputer, pemrograman, pengembangan perangkat lunak, kecerdasan buatan, dan teknologi informasi. Pembelajaran mengintegrasikan kompetensi teknologi informatika, bahasa asing, dan soft skills. Bidang pembelajaran meliputi pengembangan perangkat lunak, sistem komputer, data, dan kecerdasan buatan.

Contoh mata kuliah: Algoritma Pemrograman; Struktur Data; Pemrograman Web; Sistem Operasi; Sistem Basis Data; Jaringan Komputer; Rekayasa Perangkat Lunak; Kecerdasan Buatan. Mata kuliah lanjutan mencakup Cloud Computing, Data Science, dan Internet of Things.

Profil lulusan yang dipublikasikan: Software Engineer Specialist, IT Infrastructure Specialist, Cybersecurity Specialist, Database Specialist, AI Engineer & Consultant, dan IoT Engineer & Consultant.

Akreditasi menurut halaman program studi: Baik. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["informatika", "s1 informatika", "teknik informatika", "ilmu komputer", "programmer", "pemrograman", "software engineer", "kecerdasan buatan", "ai", "cybersecurity", "data science", "prospek kerja informatika"],
    sourceLabel: "Halaman S1 Informatika",
    sourcePath: "/akademik/programstudi/sainsdanbisnis/s1-informatika",
  },
  {
    title: "Program Studi S1 Sistem Informasi",
    category: "Program Studi",
    content: `S1 Sistem Informasi (Sarjana, Fakultas Sains dan Bisnis) berfokus pada pengembangan dan pengelolaan sistem informasi untuk mendukung pengambilan keputusan serta efisiensi organisasi. Pembelajaran mencakup analisis kebutuhan bisnis dan pemanfaatan teknologi informasi secara strategis, dipadukan dengan bahasa asing, etika, dan kewirausahaan digital.

Contoh mata kuliah: Konsep Sistem Informasi; Dasar Proses Bisnis; Transformasi Digital; Analisis dan Perancangan Sistem Informasi; Sistem Enterprise; Desain UI/UX; Audit Sistem Informasi; Manajemen Proyek SI; Tata Kelola TI.

Profil lulusan yang dipublikasikan: IT Consultant, System Analyst, Data Analyst, IT Project Manager, Information Security Analyst, Startup Developer, dan UI/UX Designer.

Akreditasi menurut halaman program studi: Baik. Data akreditasi terbaru ada di halaman Akreditasi.`,
    keywords: ["sistem informasi", "s1 sistem informasi", "si", "system analyst", "data analyst", "it consultant", "tata kelola ti", "uiux", "prospek kerja sistem informasi"],
    sourceLabel: "Halaman S1 Sistem Informasi",
    sourcePath: "/akademik/programstudi/sainsdanbisnis/s1-sistem-informasi",
  },

  // --------------------------------------------------------------------- PMB
  {
    title: "Penerimaan Mahasiswa Baru (PMB): persiapan dan langkah awal",
    category: "PMB",
    content: `Halaman Penerimaan Mahasiswa Baru (PMB) Universitas LIA membantu calon mahasiswa menemukan program studi, menyiapkan pendaftaran, dan mengetahui informasi biaya serta beasiswa.

Langkah persiapan awal:
1. Pilih bidang yang sesuai dengan minat dan rencana masa depan.
2. Hubungi tim PMB untuk menanyakan jadwal, jalur, dan ketentuan pendaftaran terbaru.
3. Siapkan dokumen sesuai panduan resmi untuk periode pendaftaran.
4. Siapkan identitas diri yang masih berlaku.
5. Siapkan ijazah atau dokumen pendidikan terakhir sesuai ketentuan jalur yang dipilih.
6. Periksa kembali formulir dan dokumen tambahan pada panduan PMB terbaru.

Pertanyaan yang sering muncul:
- Jadwal pendaftaran terbaru: hubungi tim PMB Universitas LIA untuk jadwal dan panduan resmi periode yang sedang berlangsung.
- Dokumen yang perlu disiapkan: persyaratan dapat bergantung pada program dan jalur pendaftaran; daftar di halaman PMB adalah persiapan awal dan dokumen lengkap perlu dikonfirmasi ke tim PMB.
- Biaya dan beasiswa: dapat berubah, sehingga perlu dikonfirmasi ke tim PMB sesuai periode pendaftaran.

Tim PMB dapat dihubungi melalui email humas@universitaslia.ac.id. Informasi jadwal dan ketentuan dapat berubah, jadi konfirmasikan detail terbaru kepada tim PMB. Ada pula portal pendaftaran daring di https://pmb.universitaslia.ac.id/home.`,
    keywords: ["pmb", "penerimaan mahasiswa baru", "pendaftaran", "daftar kuliah", "cara daftar", "mahasiswa baru", "maba", "syarat pendaftaran", "dokumen pendaftaran", "beasiswa", "kontak pmb", "registrasi"],
    sourceLabel: "Halaman PMB",
    sourcePath: "/pmb",
  },
  {
    title: "Biaya kuliah dan jadwal gelombang pendaftaran",
    category: "PMB",
    content: `Rincian biaya kuliah (UKT) berdasarkan program studi dan gelombang pendaftaran ditampilkan di halaman Biaya Kuliah, sedangkan jadwal pendaftaran, tes, dan daftar ulang per gelombang ditampilkan di halaman Periode Pendaftaran. Kedua halaman dikelola admin dan dapat berubah setiap periode, sehingga angka dan tanggal di sini sengaja tidak ditulis agar tidak usang.

Untuk mengetahui biaya dan jadwal terbaru, buka halaman Biaya Kuliah dan Periode Pendaftaran, atau hubungi tim PMB. Ketersediaan beasiswa dan pilihan pembayaran juga dapat berubah, jadi konfirmasikan ke tim PMB sesuai periode pendaftaran. Cara membayar tagihan dijelaskan di halaman Cara Pembayaran.`,
    keywords: ["biaya kuliah", "ukt", "uang kuliah", "berapa biaya", "biaya pendaftaran", "gelombang", "jadwal pendaftaran", "periode pendaftaran", "tarif", "spp", "mahal", "biaya semester"],
    sourceLabel: "Halaman Biaya Kuliah",
    sourcePath: "/pmb/biaya-kuliah",
  },
  {
    title: "Jalur Rekognisi Pembelajaran Lampau (RPL)",
    category: "PMB",
    content: `Jalur Rekognisi Pembelajaran Lampau (RPL) adalah jalur penerimaan mahasiswa baru yang memberi kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan atas pembelajaran yang telah diperoleh sebelumnya, baik melalui pengalaman kerja, pendidikan formal, informal, maupun nonformal. Tagline di halaman: "Raih Sarjana dengan Pengalaman Kerja".

Persyaratan umum:
- Lulusan SMA/SMK/MA sederajat yang memiliki pengalaman kerja di bidang yang relevan dengan program studi yang akan ditempuh.
- Memiliki sertifikat pelatihan atau bukti pengalaman kerja yang relevan.
- Membayar biaya pendaftaran sesuai ketentuan di halaman RPL.

Contoh dokumen pendukung: daftar riwayat pekerjaan dengan rincian tugas; sertifikat pengoperasian/lisensi; dokumentasi pekerjaan (foto/video/produk/hasil tes); buku harian atau logbook pekerjaan; lembar tugas/kerja; dokumen analisis/perancangan; sertifikat pelatihan beserta uraian materi dan lamanya; keanggotaan asosiasi profesi yang relevan; referensi/surat keterangan dari pemberi kerja atau supervisor; penghargaan dari industri; penilaian kinerja dari perusahaan.

Alur pendaftaran: melengkapi formulir dan berkas pendukung, melakukan pembayaran asesmen, verifikasi formulir dan berkas oleh tim terkait, mengikuti wawancara dan tes asesmen sesuai jadwal, memeriksa hasil asesmen melalui informasi tim PMB, lalu menyelesaikan daftar ulang.

Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil evaluasi terhadap pendidikan dan capaian pembelajaran sebelumnya. Nominal biaya dan jadwal RPL terbaru tercantum di halaman Jalur RPL.`,
    keywords: ["rpl", "rekognisi pembelajaran lampau", "jalur rpl", "kuliah sambil kerja", "pengalaman kerja", "transfer kredit", "alih kredit", "jalur pendaftaran", "kelas karyawan", "asesmen rpl", "syarat rpl"],
    sourceLabel: "Halaman Jalur RPL",
    sourcePath: "/pmb/jalur-rpl",
  },
  {
    title: "Mahasiswa asing: syarat dan dokumen izin belajar",
    category: "PMB",
    content: `Mahasiswa asing adalah warga negara asing yang akan mengikuti pendidikan di Universitas LIA. Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib memenuhi dokumen persyaratan yang digunakan untuk mengurus izin belajar, antara lain:
- Surat pernyataan tidak akan bekerja selama belajar di Indonesia, tidak berpartisipasi dalam aktivitas politik, dan mematuhi peraturan perundang-undangan yang berlaku di Indonesia (bermeterai).
- Ijazah yang telah disetarakan, transkrip akademik, dan rapor terakhir.
- Surat Keterangan Jaminan Pembiayaan.
- Foto berwarna ukuran paspor.
- Paspor orang tua atau penjamin.
- Keterangan Izin Tinggal Terbatas (KITAS), khusus untuk izin perpanjangan.
- Surat keterangan diterima di Universitas LIA (Letter of Acceptance).

Contoh dokumen persyaratan dapat dilihat di izinbelajar.kemdiktisaintek.go.id (https://izinbelajar.kemdiktisaintek.go.id). Daftar lengkap dan terbaru tersedia di halaman Mahasiswa Asing.`,
    keywords: ["mahasiswa asing", "mahasiswa internasional", "izin belajar", "kitas", "letter of acceptance", "paspor", "foreign student", "warga negara asing", "wna", "international student", "visa belajar"],
    sourceLabel: "Halaman Mahasiswa Asing",
    sourcePath: "/pmb/mahasiswa-asing",
  },
  {
    title: "Pengunduran diri dan pengembalian biaya",
    category: "PMB",
    content: `Syarat dan ketentuan pengunduran diri mahasiswa menurut halaman Pengunduran Diri:
1. Diterima di PTN: mahasiswa wajib menyertakan surat keterangan dari kampus yang bersangkutan, dan biaya yang sudah dibayarkan dikembalikan 80%.
2. Sakit keras atau perawatan medis: mahasiswa wajib menyertakan surat keterangan dokter, dan biaya yang sudah dibayarkan dikembalikan 80% jika waktu pengunduran diri sebelum kegiatan perkuliahan dimulai.
3. Alasan lainnya di luar poin 1 dan 2: biaya yang sudah dibayarkan tidak dapat dikembalikan.

Ketentuan ini dapat diperbarui admin; cek halaman Pengunduran Diri untuk versi terbaru. Prosedur administrasi pengunduran diri (surat bebas pustaka, bebas tanggungan keuangan, dan SK pengunduran diri) ditangani BAAKA.`,
    keywords: ["pengunduran diri", "mengundurkan diri", "resign kuliah", "refund", "pengembalian biaya", "uang kembali", "batal kuliah", "keluar kampus", "diterima ptn", "pengembalian 80%"],
    sourceLabel: "Halaman Pengunduran Diri",
    sourcePath: "/pmb/pengunduran-diri",
  },
  {
    title: "Cara membuat kode Virtual Account (VA) tagihan di SiAkad",
    category: "PMB",
    content: `Panduan membuat kode pembayaran (Virtual Account/VA) dari SiAkad (sistem informasi akademik):
1. Login pada sistem informasi akademik kampus.
2. Klik profil, lalu pilih menu Riwayat Keuangan (di profil juga ada menu Tagihan Mahasiswa untuk melihat tagihan).
3. Centang tagihan yang ingin dibayar.
4. Klik tombol Generated Virtual Account.
5. Simpan kode VA yang didapatkan dan bayarkan sebelum jatuh tempo (kode pembayaran dapat kedaluwarsa).

Setelah kode VA terbit, pembayaran dilakukan lewat kanal bank yang dijelaskan pada halaman Cara Pembayaran.`,
    keywords: ["virtual account", "va", "kode bayar", "kode pembayaran", "siakad", "riwayat keuangan", "tagihan mahasiswa", "generate va", "cara bayar kuliah", "tagihan kuliah", "bayar ukt"],
    sourceLabel: "Halaman Cara Pembayaran",
    sourcePath: "/pmb/cara-pembayaran",
  },
  {
    title: "Kanal pembayaran tagihan kuliah (ATM, Livin' by Mandiri, cabang, bank lain)",
    category: "PMB",
    content: `Pembayaran tagihan dilakukan menggunakan kode bayar atau nomor Virtual Account (VA) dari SiAkad. Kode perusahaan/institusi yang dipakai adalah 89631 atau EDUFIN.

ATM Mandiri: masukkan kartu dan PIN, pilih BAYAR/BELI, lalu LAINNYA, lalu Multipayment. Masukkan kode institusi 89631 atau EDUFIN beserta kode VA dari SiAkad (contoh format: 8963157000001), lalu konfirmasi.

Livin' by Mandiri: login, pilih menu PENDIDIKAN, ketik nama biller "EDUFIN" atau kode biller 89631, input kode bayar/nomor VA dari SiAkad, periksa detail transaksi, lalu Lanjut Bayar. Struk bukti bayar dapat dibagikan atau diunduh.

Cabang Mandiri: isi formulir setoran/transfer dengan tanda Setoran ke Rekening Sendiri (tunai) atau Transfer (dari rekening), tanda Penduduk jika penerima dan pengirim penduduk Indonesia, nama pengirim sesuai penyetor, nama penerima 89631 atau EduFin, nama bank BANK MANDIRI, dan nomor rekening berisi kode VA dari SiAkad.

Mobile banking atau ATM bank lain: pilih Transfer ke Bank Lain/Antar Bank, bank tujuan MANDIRI (kode bank 008), isi kode bayar/VA pada rekening tujuan, dan isi nominal sesuai tagihan di SiAkad. Pilih layanan transfer ONLINE, bukan RTGS dan bukan BI FAST. Nominal yang diinput hanya nominal tagihan; abaikan biaya administrasi Rp4.000 dari bank lain. Simpan struk sebagai bukti pembayaran.`,
    keywords: ["cara pembayaran", "atm mandiri", "livin mandiri", "livin by mandiri", "mobile banking", "transfer bank lain", "kode biller", "edufin", "89631", "bayar via bank", "bukti pembayaran", "mandiri"],
    sourceLabel: "Halaman Cara Pembayaran",
    sourcePath: "/pmb/cara-pembayaran",
  },

  // ------------------------------------------------------- LAYANAN AKADEMIK
  {
    title: "Registrasi ulang, KRS, dan kartu peserta ujian",
    category: "Layanan Akademik",
    content: `Prosedur layanan BAAKA (Biro Administrasi Akademik dan Kemahasiswaan) menurut halaman Unit dan Bagian:

Registrasi ulang mahasiswa baru (bagi yang lulus seleksi PMB): pembayaran biaya kuliah semester 1 sesuai tagihan melalui bank mitra resmi; penyerahan berkas verifikasi identitas (KTP/KK), legalisir ijazah/SKL, dan pasfoto; perekaman data diri dan pengesahan status mahasiswa di loket BAAKA; lalu penerimaan Nomor Pokok Mahasiswa (NPM), aktivasi portal SIAKAD, KTM, dan jas almamater.

Registrasi ulang mahasiswa lama: dilakukan berkala tiap awal semester ganjil dan genap, meliputi pelunasan biaya kuliah semester berjalan sebelum batas akhir kalender akademik, pengisian Kartu Rencana Studi (KRS) mandiri di SIAKAD, konsultasi dan persetujuan KRS oleh Dosen Pembimbing Akademik (PA), serta pencetakan KRS tervalidasi sebagai bukti kepesertaan perkuliahan.

Kartu peserta ujian (UTS dan UAS): syaratnya kehadiran kuliah minimal 75% dan pelunasan kewajiban keuangan tahap ujian. Kartu diunduh dan dicetak dari akun SIAKAD, lalu dibawa bersama KTM ke ruang ujian.

Ketentuan resmi dan jadwal mengikuti kalender akademik serta pengumuman BAAKA.`,
    keywords: ["registrasi ulang", "daftar ulang", "her registrasi", "krs", "kartu rencana studi", "kartu ujian", "kartu peserta ujian", "uts", "uas", "npm", "ktm", "siakad", "dosen pa", "pembimbing akademik"],
    sourceLabel: "Halaman BAAKA",
    sourcePath: "/profil/unit-dan-bagian/baaka",
  },
  {
    title: "Transkrip nilai, legalisir, dan surat keterangan lulus (SKL)",
    category: "Layanan Akademik",
    content: `Menurut halaman BAAKA:

Transkrip nilai: permohonan diajukan lewat portal layanan atau formulir di loket BAAKA, riwayat SKS dan Indeks Prestasi diperiksa dan divalidasi, lalu dokumen resmi dicetak dengan tanda tangan pimpinan dan stempel universitas. Transkrip dapat diambil fisik atau dikirim berupa salinan digital bertanda tangan digital. Ada transkrip sementara (misalnya untuk beasiswa atau magang) dan transkrip kelulusan.

Surat Keterangan Lulus (SKL): bukti kelulusan resmi sementara sebelum ijazah dan transkrip asli diserahkan. Syaratnya mahasiswa sudah dinyatakan lulus pada sidang yudisium; permohonan diajukan di loket BAAKA dengan melampirkan berita acara yudisium. SKL dapat dipakai untuk melamar pekerjaan atau studi lanjut.

Legalisir ijazah, transkrip, dan SKPI: bawa salinan fotokopi beserta dokumen asli untuk verifikasi, nomor ijazah dan data kelulusan diperiksa pada arsip universitas, bayar biaya administrasi legalisir sesuai jumlah rangkap, lalu dokumen dicap basah dan ditandatangani pejabat berwenang. BAAKA juga melayani verifikasi keaslian ijazah bagi instansi dan perusahaan.`,
    keywords: ["transkrip", "transkrip nilai", "legalisir", "legalisir ijazah", "skl", "surat keterangan lulus", "skpi", "verifikasi ijazah", "dokumen kelulusan", "khs", "nilai"],
    sourceLabel: "Halaman BAAKA",
    sourcePath: "/profil/unit-dan-bagian/baaka",
  },
  {
    title: "Cuti akademik, aktif kembali, status non-aktif, dan pengunduran diri mahasiswa",
    category: "Layanan Akademik",
    content: `Menurut halaman BAAKA:

Cuti akademik: penghentian sementara perkuliahan dengan izin pimpinan universitas, maksimal 2 semester. Syaratnya mahasiswa telah menempuh studi aktif sekurang-kurangnya 2 semester awal, mengajukan surat permohonan cuti yang diketahui Dosen PA dan Kaprodi, menyerahkan permohonan sebelum her-registrasi semester terkait ditutup, dan membayar biaya pemeliharaan status cuti.

Aktif kembali: ajukan surat permohonan aktif kembali ke BAAKA dengan surat izin cuti resmi, dapatkan persetujuan Ketua Program Studi dan Wakil Rektor Bidang Akademik, lakukan her-registrasi dan pembayaran semester berjalan, lalu BAAKA mengaktifkan kembali akun SIAKAD untuk pengisian KRS.

Tidak her-registrasi tanpa izin cuti: mahasiswa berstatus Non-Aktif (Mangkir). Semester mangkir tetap dihitung dalam batas maksimal masa studi, BAAKA menerbitkan surat peringatan akademik kepada mahasiswa dan orang tua/wali, dan mangkir berturut-turut yang melebihi ketentuan dapat berujung status Drop Out (DO).

Pengunduran diri mahasiswa: isi formulir bermaterai yang ditandatangani orang tua/wali, lengkapi surat bebas pinjaman dari UPT Perpustakaan dan surat bebas tanggungan keuangan dari BAUSK, lalu serahkan ke BAAKA untuk penerbitan SK Pengunduran Diri dan transkrip riwayat studi. Ketentuan pengembalian biaya ada di halaman Pengunduran Diri.`,
    keywords: ["cuti akademik", "cuti kuliah", "aktif kembali", "non aktif", "mangkir", "drop out", "do", "surat peringatan", "bebas pustaka", "bebas tanggungan", "keluar kuliah", "pengunduran diri mahasiswa"],
    sourceLabel: "Halaman BAAKA",
    sourcePath: "/profil/unit-dan-bagian/baaka",
  },
  {
    title: "Yudisium, ijazah, dan wisuda",
    category: "Layanan Akademik",
    content: `Menurut halaman BAAKA:

Yudisium: sidang resmi penetapan kelulusan setelah mahasiswa menyelesaikan seluruh beban SKS, naskah skripsi/tugas akhir, dan syarat tridharma. Persiapannya meliputi mengunggah naskah skripsi/tugas akhir yang disahkan ke repositori perpustakaan, menyerahkan sertifikat kemahiran bahasa asing dan sertifikat kegiatan pembinaan kemahasiswaan, serta verifikasi bebas tanggungan perpustakaan, keuangan, dan laboratorium. Rapat senat fakultas/prodi lalu menetapkan yudisium, IPK, dan predikat kelulusan.

Ijazah: dicetak pada blangko resmi berstandar pengaman khusus (hologram dan watermark) dengan Penomoran Ijazah Nasional (PIN), setelah data lulusan divalidasi dan disinkronkan dengan PDDikti. Ijazah ditandatangani Rektor dan Dekan, lalu diserahkan saat wisuda atau di loket BAAKA.

Wisuda: pendaftaran melalui portal wisuda resmi Universitas LIA, pelunasan biaya wisuda dan pengisian kuesioner tracer study kelulusan, pengambilan perlengkapan wisuda (toga, topi, kalung samir, undangan pendamping), serta gladi resik sebelum prosesi.`,
    keywords: ["yudisium", "ijazah", "wisuda", "kelulusan", "skripsi", "tugas akhir", "toga", "ipk", "predikat kelulusan", "pddikti", "pin ijazah", "lulus kuliah"],
    sourceLabel: "Halaman BAAKA",
    sourcePath: "/profil/unit-dan-bagian/baaka",
  },

  // -------------------------------------------------------- UNIT DAN BAGIAN
  {
    title: "Unit dan Bagian di Universitas LIA (gambaran umum)",
    category: "Unit dan Bagian",
    content: `Halaman Unit dan Bagian menjelaskan struktur unit pelaksana teknis dan biro administrasi yang menjalankan tata kelola serta pelayanan akademik dan operasional Universitas LIA:
- UPT Perpustakaan: pengelolaan dan penyediaan literatur ilmiah, buku teks, dan sarana Tri Dharma Perguruan Tinggi.
- UPT Komputer: pusat layanan teknologi informasi, infrastruktur jaringan kampus, serta Blueprint TIK.
- UPT Humas dan Marketing: komunikasi publik, publikasi institusi, dan promosi kelembagaan.
- BAAKA (Biro Administrasi Akademik dan Kemahasiswaan): melayani kebutuhan operasional studi mahasiswa.
- BAUSK (Administrasi Umum, SDM, dan Keuangan): mengelola sarana prasarana dan ketatausahaan.
- Peraturan: kumpulan ketetapan, statuta, pedoman akademik, dan regulasi internal tata kelola institusi.`,
    keywords: ["unit dan bagian", "unit", "bagian", "biro", "upt", "baaka", "bausk", "layanan kampus", "struktur unit", "administrasi", "tata kelola"],
    sourceLabel: "Halaman Unit dan Bagian",
    sourcePath: "/profil/unit-dan-bagian",
  },
  {
    title: "BAAKA: Biro Administrasi Akademik dan Kemahasiswaan",
    category: "Unit dan Bagian",
    content: `BAAKA (Biro Administrasi Akademik, Kemahasiswaan, dan Alumni) adalah pusat pelayanan administrasi akademik, registrasi mahasiswa, kemahasiswaan, pengelolaan status studi, serta layanan kelulusan dan alumni. BAAKA dipimpin Kepala Bagian dan dibantu beberapa Kepala Sub Bagian (Kasubag).

Tugas utama: menyelenggarakan registrasi mahasiswa baru dan lama, kartu ujian, transkrip nilai, cuti akademik, dan administrasi perkuliahan; memfasilitasi kegiatan organisasi kemahasiswaan, beasiswa, bimbingan konseling, yudisium, wisuda, dan legalisir; serta mengelola pelaporan statistik dan informasi PDDikti dan integrasi sistem administrasi akademik digital.

Layanan: Loket Layanan Mahasiswa Terpadu (validasi dokumen, kartu mahasiswa, surat pengantar beasiswa, konsultasi administrasi); integrasi SIAKAD dan portal akademik (KRS daring, jadwal kuliah, KHS/KPU, riwayat nilai); legalisir dan verifikasi ijazah; serta konseling dan pendampingan kemahasiswaan (kendala studi, izin khusus, bimbingan ormawa). Halaman BAAKA memuat 13 kegiatan operasional beserta alur dan persyaratannya.`,
    keywords: ["baaka", "biro administrasi akademik", "kemahasiswaan", "administrasi akademik", "loket mahasiswa", "layanan mahasiswa", "siakad", "konseling mahasiswa", "alumni", "beasiswa"],
    sourceLabel: "Halaman BAAKA",
    sourcePath: "/profil/unit-dan-bagian/baaka",
  },
  {
    title: "BAUSK: Bagian Administrasi Umum, SDM, dan Keuangan",
    category: "Unit dan Bagian",
    content: `BAUSK (Bagian Administrasi Umum, Sumber Daya Manusia, dan Keuangan) bertanggung jawab menjamin kelancaran operasional universitas melalui pengelolaan sarana prasarana, pembinaan SDM, dan tata kelola keuangan yang transparan dan akuntabel.

Tujuh pilar urusan: pemeliharaan dan pengadaan sarana prasarana; pengelolaan aset dan inventarisasi; penerimaan UKT dan biaya pendidikan; pembiayaan operasional universitas; akuntansi dan pelaporan keuangan; pelayanan kepegawaian dosen dan tenaga kependidikan; serta pengembangan kompetensi dosen dan tendik.

Sarana pendukung yang dikelola BAUSK menurut halaman: perpustakaan dan pusat sumber belajar (ruang baca ber-AC, koleksi literatur, area belajar mandiri), area parkir dan lingkungan kampus (roda dua dan roda empat, pos pengamanan 24 jam), serta aula serbaguna untuk seminar, kuliah umum, lokakarya, dan kegiatan mahasiswa.`,
    keywords: ["bausk", "administrasi umum", "sdm", "keuangan", "sarana prasarana", "sarpras", "aset kampus", "kepegawaian", "parkir", "aula", "fasilitas kampus", "penerimaan ukt"],
    sourceLabel: "Halaman BAUSK",
    sourcePath: "/profil/unit-dan-bagian/bausk",
  },
  {
    title: "UPT Komputer dan Blueprint TIK",
    category: "Unit dan Bagian",
    content: `UPT Komputer (Unit Pelaksana Teknis Komputer) adalah pusat perencanaan, pembangunan, dan perawatan infrastruktur Teknologi Informasi dan Komunikasi (TIK) yang mendukung ekosistem digital Universitas LIA, termasuk jaringan, server, dan sistem informasi manajemen perguruan tinggi.

Layanan: jaringan dan konektivitas kampus (internet broadband, Wi-Fi sivitas akademika, LAN); sistem informasi akademik dan portal (perkuliahan, registrasi, KRS); helpdesk dan dukungan teknis hardware/software, termasuk laboratorium komputer; serta keamanan (firewall, pemantauan trafik server, pencadangan data berkala).

Tugas: menyusun SOP pengelolaan, kebijakan dasar dan blueprint pengembangan TI dan SIMPT, mengembangkan program, jaringan, dan database terpadu, merencanakan situs web interaktif, mengembangkan standar perangkat keras/lunak, dan membangun sistem keamanan terpadu infrastruktur TI.

Blueprint TIK adalah dokumen rencana induk arah kebijakan, arsitektur sistem informasi, tata kelola keamanan siber, dan peta jalan transformasi digital. Empat pilarnya: arsitektur aplikasi dan layanan akademik; infrastruktur dan konektivitas kampus; tata kelola dan keamanan informasi; serta pengembangan SDM dan literasi teknologi. Roadmap-nya bertahap: konsolidasi dan integrasi fondasi, smart campus dan layanan mandiri, lalu ekosistem digital berkelanjutan.`,
    keywords: ["upt komputer", "komputer", "tik", "blueprint tik", "wifi kampus", "wi-fi", "jaringan kampus", "helpdesk", "it support", "teknologi informasi", "simpt", "keamanan siber"],
    sourceLabel: "Halaman UPT Komputer",
    sourcePath: "/profil/unit-dan-bagian/upt-komputer",
  },
  {
    title: "UPT Humas dan Marketing",
    category: "Unit dan Bagian",
    content: `UPT Humas dan Marketing adalah pusat komunikasi publik, promosi kelembagaan, serta pengelolaan reputasi dan hubungan kemitraan Universitas LIA.

Empat pilar tugas: mempromosikan dan merekrut calon mahasiswa serta mengelola sistem administrasi penerimaan mahasiswa baru berbasis teknologi informasi; mensosialisasikan kegiatan dan prestasi universitas melalui media massa dan website; mensosialisasikan kebijakan dan program universitas kepada masyarakat; serta meningkatkan citra universitas melalui kegiatan kehumasan.

Layanan: informasi PMB dan konsultasi (pendaftaran, jalur beasiswa, biaya kuliah, program studi, tatap muka maupun daring); publikasi media dan siaran pers; pengelolaan media sosial dan website; serta kunjungan sekolah dan edufair.

Kontak Humas: humas@universitaslia.ac.id.`,
    keywords: ["humas", "marketing", "promosi", "hubungan masyarakat", "media sosial", "siaran pers", "kunjungan sekolah", "edufair", "informasi pmb", "kemitraan"],
    sourceLabel: "Halaman UPT Humas dan Marketing",
    sourcePath: "/profil/unit-dan-bagian/upt-humas-marketing",
  },
  {
    title: "UPT Perpustakaan",
    category: "Unit dan Bagian",
    content: `UPT Perpustakaan Universitas LIA mengelola dan menyediakan sumber daya informasi, literatur ilmiah, dan sarana belajar untuk menunjang Tri Dharma Perguruan Tinggi (pendidikan dan pengajaran, penelitian, serta pengabdian kepada masyarakat). Unit ini berada di bawah pembinaan Wakil Rektor 1 Bidang Akademik.

Koleksi: buku teks, ensiklopedia, jurnal terindeks, dan artikel akademik maupun wawasan umum.

Layanan: sirkulasi dan peminjaman koleksi (peminjaman, pengembalian, perpanjangan); akses artikel ilmiah, publikasi penelitian, skripsi, dan basis data jurnal elektronik berlangganan; area baca tenang ber-AC dengan Wi-Fi kampus; serta bantuan penelusuran referensi, bimbingan sitasi ilmiah, dan asistensi pencarian literatur untuk tugas akhir.`,
    keywords: ["perpustakaan", "upt perpustakaan", "library", "pinjam buku", "peminjaman buku", "jurnal", "e-journal", "koleksi buku", "ruang baca", "referensi skripsi", "sitasi"],
    sourceLabel: "Halaman UPT Perpustakaan",
    sourcePath: "/profil/unit-dan-bagian/upt-perpustakaan",
  },

  // -------------------------------------------------------------- LPM, LPPM
  {
    title: "LPM: Lembaga Penjaminan Mutu",
    category: "LPM dan LPPM",
    content: `LPM Universitas LIA menjaga dan meningkatkan mutu pendidikan melalui evaluasi, peningkatan berkelanjutan, dan tata kelola akademik yang terarah, dengan tujuan membangun budaya mutu berkelanjutan menuju Universitas LIA yang unggul.

Informasi di halaman LPM:
- Laporan Tahunan Audit Mutu Internal (arsip per tahun; laporan 2025 ditandai menunggu publikasi atau verifikasi dokumen resminya).
- Laporan Tahunan Rapat Tinjauan Manajemen (RTM) dan Rencana Tindak Lanjut (RTL), juga per tahun.
- Kegiatan penjaminan mutu: sosialisasi standar mutu dan SOP, sosialisasi dan pelaksanaan Audit Mutu Internal, serta tinjauan hasil audit.
- Benchmarking: berbagi informasi dan praktik penjaminan mutu antarperguruan tinggi, termasuk benchmarking LPM Universitas LIA ke Universitas Nasional.
- Manajemen Arsip: sistem manajemen arsip dokumen LPM.`,
    keywords: ["lpm", "penjaminan mutu", "audit mutu internal", "ami", "rtm", "rtl", "rapat tinjauan manajemen", "benchmarking", "mutu", "manajemen arsip", "budaya mutu", "standar mutu"],
    sourceLabel: "Halaman LPM",
    sourcePath: "/lpm",
  },
  {
    title: "LPPM: Penelitian dan Pengabdian kepada Masyarakat",
    category: "LPM dan LPPM",
    content: `LPPM (Lembaga Penelitian dan Pengabdian kepada Masyarakat) Universitas LIA mendorong kegiatan penelitian dan pengabdian yang kreatif, produktif, dan relevan dengan perkembangan ilmu serta kebutuhan masyarakat.

Fokus LPPM: riset yang kreatif dan relevan; pengabdian yang menghubungkan pengetahuan dan keahlian akademik dengan manfaat bagi masyarakat; penyebarluasan hasil penelitian lewat publikasi ilmiah; dan kerja sama lintas bidang untuk riset dan pengabdian yang berdampak.

Cara kerja: merumuskan topik dan tujuan berdasarkan kebutuhan serta keahlian yang tersedia, mengembangkan kegiatan bersama sivitas akademika dan mitra, lalu mendorong dokumentasi dan diseminasi hasil. Informasi jurnal, publikasi, dan hasil penelitian akan ditampilkan setelah materi resmi tersedia. Pertanyaan seputar LPPM dapat dikirim ke humas@universitaslia.ac.id.`,
    keywords: ["lppm", "penelitian", "pengabdian masyarakat", "riset", "publikasi ilmiah", "jurnal", "pkm", "pengabdian", "kerja sama riset", "tri dharma"],
    sourceLabel: "Halaman LPPM",
    sourcePath: "/lppm",
  },

  // -------------------------------------------------------- KEHIDUPAN KAMPUS
  {
    title: "UKM dan kegiatan mahasiswa",
    category: "Kehidupan Kampus",
    content: `Unit Kegiatan Mahasiswa (UKM) di Universitas LIA menjadi ruang untuk belajar bersama, mengasah kemampuan, dan membangun pengalaman kampus. Bidang kegiatan yang tampil di halaman UKM: seni dan kreativitas (karya, pertunjukan), olahraga (kerja sama tim, disiplin, sportivitas), pengembangan pengetahuan dan keterampilan, kepemimpinan dan organisasi, serta sosial dan kerohanian.

Open recruitment: pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik, dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa. Informasi kontak: kemahasiswaan@universitaslia.ac.id. Profil UKM, jadwal, dan tautan pendaftaran lengkap akan ditambahkan di halaman UKM setelah data resmi tersedia.`,
    keywords: ["ukm", "unit kegiatan mahasiswa", "organisasi mahasiswa", "ormawa", "ekstrakurikuler", "kegiatan mahasiswa", "open recruitment", "oprec", "klub", "komunitas kampus", "kemahasiswaan"],
    sourceLabel: "Halaman UKM",
    sourcePath: "/kehidupan-kampus/ukm",
  },
  {
    title: "Berita, pengumuman, dan agenda acara kampus",
    category: "Kehidupan Kampus",
    content: `Website Universitas LIA memiliki tiga halaman informasi kampus yang diperbarui admin:
- Berita Terkini: berita dan informasi terbaru seputar Universitas LIA (/kehidupan-kampus/berita-terkini).
- Pengumuman: pengumuman dan informasi untuk civitas akademika (/kehidupan-kampus/pengumuman).
- Agenda Acara: rencana kegiatan, acara kampus, seminar, dan aktivitas lain yang akan berlangsung (/kehidupan-kampus/agenda-acara).

Isi terbaru di ketiga halaman ini dapat dibuka langsung di website karena terus berubah.`,
    keywords: ["berita", "berita terkini", "pengumuman", "agenda", "agenda acara", "acara kampus", "seminar", "event", "kegiatan kampus", "info terbaru", "kabar kampus"],
    sourceLabel: "Halaman Berita Terkini",
    sourcePath: "/kehidupan-kampus/berita-terkini",
  },

  // ------------------------------------------------------------------ ALUMNI
  {
    title: "Alumni, Ikatan Alumni, dan Career Center",
    category: "Alumni",
    content: `Halaman Alumni Universitas LIA menjadi ruang informasi untuk menjaga hubungan antara lulusan, mahasiswa, dan almamater serta membuka peluang berbagi pengalaman. Bagian-bagiannya:
- Ikatan Alumni: wadah resmi untuk mempererat hubungan lulusan dengan almamater, kemitraan strategis, dukungan karier alumni, informasi reuni, seminar, workshop, dan kegiatan sosial, serta pendaftaran ke database ikatan alumni.
- Career Center: informasi lowongan kerja dari mitra perusahaan, panduan penyusunan CV dan tips interview, layanan bagi perusahaan yang ingin memasang lowongan atau mencari talenta alumni, serta berita seputar bursa kerja, seminar karier, dan pelatihan.
- Tracer Study: statistik survei karier alumni (lihat entri Tracer Study).`,
    keywords: ["alumni", "ikatan alumni", "career center", "lowongan kerja", "karier", "bursa kerja", "reuni", "jejaring alumni", "cv", "lulusan", "loker"],
    sourceLabel: "Halaman Alumni",
    sourcePath: "/alumni",
  },
  {
    title: "Tracer Study alumni",
    category: "Alumni",
    content: `Halaman Tracer Study menampilkan statistik tracer study alumni Universitas LIA, yaitu gambaran perjalanan karier alumni berdasarkan hasil survei, dalam bentuk grafik dan tabel. Angka dan persentase hasil survei dapat berubah sesuai tahun survei dan data yang masuk, sehingga sebaiknya dibaca langsung di halaman Tracer Study. Pengisian tracer study juga menjadi bagian dari proses kelulusan (kuesioner tracer study kelulusan pada pendaftaran wisuda).`,
    keywords: ["tracer study", "survei alumni", "kuesioner alumni", "statistik alumni", "karier alumni", "masa tunggu kerja", "keselarasan pekerjaan", "gaji alumni", "tracer"],
    sourceLabel: "Halaman Tracer Study",
    sourcePath: "/alumni/tracer-study",
  },

  // ------------------------------------------------------------------ KONTAK
  {
    title: "Kontak dan alamat Universitas LIA",
    category: "Kontak",
    content: `Kontak resmi yang tercantum di website Universitas LIA:
- Alamat: Jl. Pengadegan Timur Raya No.3.
- Email Humas dan informasi umum (termasuk PMB dan LPPM): humas@universitaslia.ac.id.
- Email Kemahasiswaan (misalnya untuk UKM): kemahasiswaan@universitaslia.ac.id.
- WhatsApp: 0858-8103-6948.

Untuk informasi pendaftaran, tim PMB dapat dihubungi lewat kanal di atas. Portal pendaftaran daring: https://pmb.universitaslia.ac.id/home.`,
    keywords: ["kontak", "hubungi", "alamat", "lokasi kampus", "whatsapp", "wa", "email", "nomor telepon", "customer service", "cs", "humas", "dimana kampus", "no hp", "lokasi"],
    sourceLabel: "Footer website Universitas LIA",
    sourcePath: CONTACT_PATH,
  },

  // ---------------------------------------------------------- PANDUAN WEBSITE
  {
    title: "Peta halaman website Universitas LIA",
    category: "Panduan Website",
    content: `Daftar halaman utama website dan isinya:
- Profil: /profil (sejarah /profil/sejarah, visi dan misi /profil/visi-misi, struktur organisasi /profil/struktur-organisasi, akreditasi institusi /profil/akreditasi, fasilitas kampus /profil/fasilitas-kampus, unit dan bagian /profil/unit-dan-bagian).
- Akademik: fakultas dan program studi /akademik/fakultas, akreditasi program studi /akademik/akreditasi, kalender akademik /akademik/kalender-akademik, kurikulum /akademik/kurikulum.
- PMB: /pmb (periode pendaftaran /pmb/periode-pendaftaran, biaya kuliah /pmb/biaya-kuliah, jalur RPL /pmb/jalur-rpl, cara pembayaran /pmb/cara-pembayaran, pengunduran diri /pmb/pengunduran-diri, mahasiswa asing /pmb/mahasiswa-asing).
- Kehidupan kampus: berita terkini, pengumuman, agenda acara, dan UKM di /kehidupan-kampus.
- Alumni: /alumni (ikatan alumni, tracer study, career center).
- LPM: /lpm; LPPM: /lppm; Laporan Tahunan Rektor: /laporan-tahunan-rektor.

Data akreditasi institusi dan program studi (beserta regulasi BAN-PT), kalender akademik, struktur organisasi, dan fasilitas kampus ditampilkan dari data yang dikelola admin di halaman masing-masing, sehingga detail terbarunya dibaca langsung di sana.`,
    keywords: ["peta situs", "sitemap", "menu website", "halaman website", "cara cari informasi", "dimana informasi", "navigasi", "akreditasi", "kalender akademik", "struktur organisasi", "fasilitas kampus", "link halaman"],
    sourceLabel: "Beranda Universitas LIA",
    sourcePath: "/",
  },
];

module.exports = entries;
