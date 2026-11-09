"use client";

import { useId, useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Icon } from "@/components/icons";

interface KegiatanItem {
  id: string;
  number: string;
  title: string;
  category: "Registrasi & Studi" | "Status Mahasiswa" | "Kelulusan & Alumni";
  summary: string;
  steps: string[];
  requirements: string[];
}

const KEGIATAN_DATA: KegiatanItem[] = [
  {
    id: "registrasi-baru",
    number: "01",
    title: "Registrasi Ulang Mahasiswa Baru",
    category: "Registrasi & Studi",
    summary:
      "Verifikasi berkas pendaftaran dan her-registrasi administrasi bagi calon mahasiswa baru yang telah dinyatakan lulus seleksi PMB Universitas LIA.",
    steps: [
      "Pembayaran biaya kuliah semester 1 sesuai tagihan melalui bank mitra resmi.",
      "Penyerahan berkas verifikasi identitas (KTP/KK), legalisir ijazah/SKL, dan pasfoto resmi.",
      "Perekaman biometrik/data diri dan pengesahan status mahasiswa di loket BAAKA.",
      "Penerimaan Nomor Pokok Mahasiswa (NPM), aktivasi portal SIAKAD, KTM, dan jas almamater.",
    ],
    requirements: ["Bukti Bayar Bank Mitra", "Ijazah / SKL Terlegalisir", "Salinan KTP & KK", "Pasfoto Resmi"],
  },
  {
    id: "registrasi-lama",
    number: "02",
    title: "Registrasi Ulang Mahasiswa Lama",
    category: "Registrasi & Studi",
    summary:
      "Daftar ulang berkala tiap awal semester ganjil dan genap untuk memperbarui status mahasiswa aktif serta validasi rencana studi.",
    steps: [
      "Pelunasan biaya kuliah (SPP/BPP) semester berjalan sebelum batas akhir kalender akademik.",
      "Pengisian Kartu Rencana Studi (KRS) secara mandiri melalui portal SIAKAD LIA.",
      "Konsultasi akademik dan persetujuan (approval) KRS oleh Dosen Pembimbing Akademik (PA).",
      "Pencetakan KRS tervalidasi sebagai bukti sah kepesertaan perkuliahan semester aktif.",
    ],
    requirements: ["Bukti Lunas Biaya Semester", "KRS Online SIAKAD", "Persetujuan Dosen PA"],
  },
  {
    id: "kartu-ujian",
    number: "03",
    title: "Pencetakan Kartu Peserta Ujian",
    category: "Registrasi & Studi",
    summary:
      "Penerbitan kartu tanda peserta resmi untuk mengikuti Ujian Tengah Semester (UTS) dan Ujian Akhir Semester (UAS).",
    steps: [
      "Memenuhi batas minimal kehadiran kuliah (minimal 75% tatap muka / e-learning).",
      "Verifikasi pelunasan kewajiban administrasi keuangan tahap ujian pada portal keuangan.",
      "Mengunduh serta mencetak Kartu Peserta Ujian berfoto melalui akun SIAKAD masing-masing.",
      "Membawa kartu ujian fisik bersama Kartu Tanda Mahasiswa (KTM) saat memasuki ruang ujian.",
    ],
    requirements: ["Presensi Kuliah ≥ 75%", "Bebas Tunggakan Keuangan", "KTM Asli Aktif"],
  },
  {
    id: "transkrip-akademik",
    number: "04",
    title: "Pencetakan Transkrip Akademik",
    category: "Registrasi & Studi",
    summary:
      "Penerbitan rekapitulasi nilai akademik resmi berkop universitas, baik transkrip sementara (beasiswa/magang) maupun transkrip kelulusan.",
    steps: [
      "Pengajuan permohonan transkrip nilai melalui portal layanan atau formulir di loket BAAKA.",
      "Pemeriksaan dan validasi riwayat SKS serta Indeks Prestasi oleh Kasubag Akademik.",
      "Pencetakan dokumen transkrip nilai resmi bertanda tangan pimpinan dan stempel universitas.",
      "Pengambilan dokumen fisik atau pengiriman salinan digital resmi bertanda tangan digital.",
    ],
    requirements: ["Formulir Permohonan Transkrip", "KTM / Identitas Diri", "Bukti Bebas Biaya Layanan"],
  },
  {
    id: "pengunduran-diri",
    number: "05",
    title: "Pengunduran Diri Mahasiswa",
    category: "Status Mahasiswa",
    summary:
      "Prosedur pelepasan status kemahasiswaan secara permanen dan sah dari Universitas LIA atas keputusan pribadi mahasiswa.",
    steps: [
      "Mengisi formulir permohonan pengunduran diri bermaterai dan ditandatangani orang tua/wali.",
      "Memperoleh surat bebas pinjaman buku dan koleksi dari UPT Perpustakaan.",
      "Memperoleh surat keterangan bebas tanggungan administrasi keuangan dari BAUSK.",
      "Penyerahan berkas ke BAAKA untuk penerbitan Surat Keputusan (SK) Pengunduran Diri dan transkrip nilai riwayat studi.",
    ],
    requirements: ["Surat Izin Orang Tua/Wali", "Surat Bebas Perpustakaan", "Surat Bebas Keuangan", "KTM Asli"],
  },
  {
    id: "cuti-akademik",
    number: "06",
    title: "Cuti Akademik",
    category: "Status Mahasiswa",
    summary:
      "Penghentian sementara perkuliahan dengan izin resmi pimpinan universitas untuk jangka waktu tertentu (maksimal 2 semester).",
    steps: [
      "Mahasiswa telah menempuh studi aktif sekurang-kurangnya 2 (dua) semester awal.",
      "Mengajukan surat permohonan cuti akademik yang diketahui Dosen PA dan Kaprodi.",
      "Menyerahkan permohonan sebelum batas penutupan masa her-registrasi semester yang bersangkutan.",
      "Membayar biaya pemeliharaan status cuti akademik ke rekening universitas.",
    ],
    requirements: ["Telah Lulus Semester 2", "Formulir Cuti Disetujui Dosen PA", "Bebas Tunggakan Keuangan"],
  },
  {
    id: "aktif-kembali",
    number: "07",
    title: "Permohonan Aktif Kembali",
    category: "Status Mahasiswa",
    summary:
      "Prosedur pengaktifan kembali status perkuliahan bagi mahasiswa yang telah menyelesaikan masa cuti akademik atau re-aktivasi status studi.",
    steps: [
      "Mengajukan surat permohonan aktif kembali ke BAAKA dengan melampirkan Surat Izin Cuti resmi.",
      "Mendapatkan persetujuan dari Ketua Program Studi dan Wakil Rektor Bidang Akademik.",
      "Melakukan her-registrasi dan pembayaran biaya kuliah semester berjalan di bank mitra.",
      "BAAKA mengaktifkan kembali akun SIAKAD untuk pengisian Kartu Rencana Studi (KRS).",
    ],
    requirements: ["Surat Izin Cuti Terdahulu", "Persetujuan Kaprodi", "Bukti Pembayaran Registrasi"],
  },
  {
    id: "mangkir-kuliah",
    number: "08",
    title: "Mangkir Kuliah atau Non-Aktif",
    category: "Status Mahasiswa",
    summary:
      "Ketentuan dan penanganan evaluasi status bagi mahasiswa yang tidak melakukan her-registrasi tanpa izin cuti resmi.",
    steps: [
      "Mahasiswa yang tidak melakukan her-registrasi otomatis berstatus Non-Aktif (Mangkir).",
      "Semester mangkir tetap diperhitungkan dalam batas maksimal masa studi mahasiswa.",
      "BAAKA menerbitkan surat peringatan akademik (SP) kepada mahasiswa dan orang tua/wali.",
      "Bila mangkir berturut-turut melebihi batas batas ketentuan, mahasiswa dapat dikenakan status Drop Out (DO).",
    ],
    requirements: ["Evaluasi Batas Masa Studi", "Surat Peringatan Akademik", "Konseling Program Studi"],
  },
  {
    id: "yudisium",
    number: "09",
    title: "Yudisium",
    category: "Kelulusan & Alumni",
    summary:
      "Sidang resmi penetapan kelulusan mahasiswa setelah menyelesaikan seluruh beban SKS, naskah skripsi/tugas akhir, dan syarat tridharma.",
    steps: [
      "Mengunggah naskah skripsi/tugas akhir yang telah disahkan ke sistem repositori perpustakaan.",
      "Menyerahkan sertifikat kemahiran bahasa asing dan sertifikat kegiatan pembinaan kemahasiswaan.",
      "Verifikasi berkas bebas tanggungan perpustakaan, keuangan, dan laboratorium.",
      "Rapat senat fakultas/prodi menetapkan yudisium kelulusan, Indeks Prestasi Kumulatif (IPK), dan predikat kelulusan.",
    ],
    requirements: ["Naskah Skripsi Disahkan", "Sertifikat Kemahiran Bahasa", "Surat Bebas Pustaka & Keuangan"],
  },
  {
    id: "penerbitan-ijazah",
    number: "10",
    title: "Penerbitan Ijazah",
    category: "Kelulusan & Alumni",
    summary:
      "Pencetakan dokumen ijazah resmi lulusan berstandar pengaman negara lengkap dengan Penomoran Ijazah Nasional (PIN).",
    steps: [
      "Validasi dan sinkronisasi data diri lulusan dengan Pangkalan Data Pendidikan Tinggi (PDDikti).",
      "Pencetakan blangko ijazah resmi berstandar pengaman khusus anti-pemalsuan (hologram & watermark).",
      "Penandatanganan dokumen ijazah asli oleh Rektor Universitas LIA dan Dekan Fakultas.",
      "Penyerahan dokumen ijazah fisik kepada lulusan pada saat wisuda atau loket BAAKA.",
    ],
    requirements: ["Lulus Sidang Yudisium", "Validasi Data PDDikti", "Bebas Peminjaman Kampus"],
  },
  {
    id: "penerbitan-skl",
    number: "11",
    title: "Penerbitan Surat Keterangan Lulus",
    category: "Kelulusan & Alumni",
    summary:
      "Penerbitan dokumen SKL sebagai bukti kelulusan resmi sementara sebelum ijazah dan transkrip asli diserahkan kepada wisudawan.",
    steps: [
      "Mahasiswa telah dinyatakan lulus pada sidang yudisium resmi program studi.",
      "Mengajukan permohonan SKL di loket BAAKA dengan melampirkan berita acara yudisium.",
      "Pemeriksaan dan pencetakan surat keterangan resmi bertanda tangan Dekan atau Kepala BAAKA.",
      "Dapat langsung digunakan secara sah untuk keperluan melamar pekerjaan atau studi lanjut.",
    ],
    requirements: ["Berita Acara Yudisium", "Formulir Permohonan SKL", "Bebas Tanggungan Akademik"],
  },
  {
    id: "penyelenggaraan-wisuda",
    number: "12",
    title: "Penyelenggaraan Wisuda",
    category: "Kelulusan & Alumni",
    summary:
      "Koordinasi dan pelaksanaan upacara prosesi wisuda pelepasan para lulusan diploma dan sarjana Universitas LIA.",
    steps: [
      "Pendaftaran wisuda melalui portal wisuda resmi Universitas LIA.",
      "Pelunasan biaya wisuda dan pengisian kuesioner tracer study kelulusan.",
      "Pengambilan perlengkapan wisuda (toga, topi, kalung samir, dan undangan pendamping).",
      "Menghadiri gladi resik dan mengikuti prosesi upacara wisuda khidmat universitas.",
    ],
    requirements: ["Bukti Lulus Yudisium", "Bukti Pembayaran Wisuda", "Pengisian Tracer Study"],
  },
  {
    id: "legalisir-dokumen",
    number: "13",
    title: "Legalisir Ijazah dan Transkrip Akademik",
    category: "Kelulusan & Alumni",
    summary:
      "Pelayanan pengesahan salinan fotokopi ijazah, transkrip nilai akademik, dan SKPI lulusan Universitas LIA dengan cap basah resmi.",
    steps: [
      "Membawa salinan fotokopi dokumen beserta ijazah dan transkrip asli untuk verifikasi fisik.",
      "Pemeriksaan nomor ijazah dan data kelulusan pada buku induk arsip universitas.",
      "Pembayaran biaya administrasi legalisir sesuai dengan jumlah rangkap salinan dokumen.",
      "Pemberian cap basah dan tanda tangan pejabat berwenang serta penyerahan dokumen terlegalisir.",
    ],
    requirements: ["Ijazah & Transkrip Asli", "Salinan Fotokopi Rapi", "Bukti Bayar Administrasi"],
  },
];

const CATEGORIES = ["Semua", "Registrasi & Studi", "Status Mahasiswa", "Kelulusan & Alumni"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function BaakaKegiatan() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Semua");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "registrasi-baru": true, // First item opened for friendly preview
  });

  const searchInputId = useId();

  const filteredKegiatan = useMemo(() => {
    return KEGIATAN_DATA.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.steps.some((step) =>
          step.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        item.requirements.some((req) =>
          req.toLowerCase().includes(searchQuery.toLowerCase())
        );

      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    filteredKegiatan.forEach((item) => {
      allOpen[item.id] = true;
    });
    setOpenItems(allOpen);
  };

  const handleCollapseAll = () => {
    setOpenItems({});
  };

  const allFilteredOpen =
    filteredKegiatan.length > 0 &&
    filteredKegiatan.every((item) => openItems[item.id]);

  return (
    <ScrollReveal delay={120}>
      <section
        aria-labelledby="baaka-kegiatan-title"
        className="upt-section upt-wrap baaka-kegiatan-section"
      >
        {/* Section Header */}
        <div className="upt-section-header">
          <span className="upt-eyebrow">PROSEDUR &amp; LAYANAN AKADEMIK</span>
          <h2 className="upt-section-title" id="baaka-kegiatan-title">
            Kegiatan dan Layanan Mahasiswa BAAKA
          </h2>
          <p className="upt-section-desc">
            Panduan lengkap alur pelaksanaan, regulasi, dan persyaratan 13 kegiatan operasional administrasi akademik Universitas LIA.
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="baaka-toolbar">
          <div className="baaka-search-wrap">
            <span aria-hidden="true" className="baaka-search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              aria-label="Cari nama kegiatan atau persyaratan"
              className="baaka-search-input"
              id={searchInputId}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kegiatan (misal: registrasi, kartu ujian, cuti, wisuda)..."
              type="search"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                aria-label="Bersihkan pencarian"
                className="baaka-search-clear"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <div className="baaka-toolbar-right">
            <div aria-label="Kategori kegiatan" className="baaka-category-pills" role="tablist">
              {CATEGORIES.map((cat) => {
                const count =
                  cat === "Semua"
                    ? KEGIATAN_DATA.length
                    : KEGIATAN_DATA.filter((i) => i.category === cat).length;
                return (
                  <button
                    aria-selected={selectedCategory === cat}
                    className={`baaka-pill-btn ${selectedCategory === cat ? "is-active" : ""}`}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    role="tab"
                    type="button"
                  >
                    <span>{cat}</span>
                    <span className="baaka-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="baaka-toggle-all-btn"
              onClick={allFilteredOpen ? handleCollapseAll : handleExpandAll}
              type="button"
            >
              {allFilteredOpen ? "Tutup Semua" : "Buka Semua"}
            </button>
          </div>
        </div>

        {/* Status Count Text */}
        <div className="baaka-status-bar">
          <span className="baaka-status-count">
            Menampilkan <strong>{filteredKegiatan.length}</strong> dari {KEGIATAN_DATA.length} kegiatan
          </span>
          {searchQuery && (
            <span className="baaka-search-badge">
              Kata kunci: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        {/* Seamless Unified List Card */}
        {filteredKegiatan.length === 0 ? (
          <div className="baaka-empty-state">
            <span className="baaka-empty-icon">📂</span>
            <h3 className="baaka-empty-title">Tidak ada kegiatan yang ditemukan</h3>
            <p className="baaka-empty-desc">
              Silakan coba kata kunci lain atau pilih tab kategori <strong>Semua</strong>.
            </p>
            <button
              className="baaka-pill-btn is-active"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("Semua");
              }}
              type="button"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="baaka-unified-list">
            {filteredKegiatan.map((item) => {
              const isOpen = !!openItems[item.id];
              return (
                <div
                  className={`baaka-list-row ${isOpen ? "is-open" : ""}`}
                  key={item.id}
                >
                  <button
                    aria-controls={`drawer-${item.id}`}
                    aria-expanded={isOpen}
                    className="baaka-row-header"
                    id={`header-${item.id}`}
                    onClick={() => toggleItem(item.id)}
                    type="button"
                  >
                    <div className="baaka-row-header-left">
                      <span className="baaka-row-number">{item.number}</span>
                      <div className="baaka-row-title-wrap">
                        <h3 className="baaka-row-title">{item.title}</h3>
                        <span className="baaka-row-category">{item.category}</span>
                      </div>
                    </div>

                    <div className="baaka-row-action">
                      <span aria-hidden="true" className="baaka-circle-toggle">
                        <span className="baaka-toggle-glyph">{isOpen ? "−" : "+"}</span>
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      aria-labelledby={`header-${item.id}`}
                      className="baaka-row-drawer"
                      id={`drawer-${item.id}`}
                      role="region"
                    >
                      <div className="baaka-drawer-inner">
                        {/* Summary Lead */}
                        <div className="baaka-drawer-summary">
                          <p className="baaka-summary-text">{item.summary}</p>
                        </div>

                        {/* Content Columns: Procedure Steps & Requirements */}
                        <div className="baaka-drawer-grid">
                          {/* Column 1: Step-by-Step Flow */}
                          <div className="baaka-steps-col">
                            <h4 className="baaka-col-heading">
                              <span aria-hidden="true" className="baaka-heading-icon">📋</span>
                              Alur &amp; Prosedur Pelaksanaan
                            </h4>
                            <ol className="baaka-steps-timeline">
                              {item.steps.map((step, idx) => (
                                <li className="baaka-step-item" key={idx}>
                                  <span className="baaka-step-num">{idx + 1}</span>
                                  <span className="baaka-step-desc">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Column 2: Requirements Badges */}
                          <div className="baaka-req-col">
                            <h4 className="baaka-col-heading">
                              <span aria-hidden="true" className="baaka-heading-icon">📁</span>
                              Persyaratan &amp; Dokumen Terkait
                            </h4>
                            <div className="baaka-req-badges">
                              {item.requirements.map((req, idx) => (
                                <span className="baaka-req-pill" key={idx}>
                                  <span aria-hidden="true" className="baaka-req-check">✓</span>
                                  {req}
                                </span>
                              ))}
                            </div>

                            <div className="baaka-drawer-note">
                              <p>
                                <strong>Catatan:</strong> Pelayanan dilayani pada hari kerja (Senin - Jumat, 08.00 - 16.00 WIB) di Loket BAAKA atau daring via SIAKAD.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </ScrollReveal>
  );
}
