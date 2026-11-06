"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

export interface PengumumanItem {
  id: string;
  category: "AKADEMIK" | "ADMINISTRASI" | "KEMAHASISWAAN" | "PENERIMAAN";
  categoryLabel: string;
  title: string;
  description: string;
  date: string;
  detail?: string;
}

const CATEGORIES = [
  { id: "semua", label: "Semua pengumuman" },
  { id: "akademik", label: "Akademik" },
  { id: "administrasi", label: "Administrasi" },
  { id: "kemahasiswaan", label: "Kemahasiswaan" },
] as const;

const PENGUMUMAN_ITEMS: PengumumanItem[] = [
  {
    id: "kalender-akademik",
    category: "AKADEMIK",
    categoryLabel: "Akademik",
    title: "Informasi kalender akademik",
    description: "Tanggal publikasi dan detail pengumuman akan ditambahkan.",
    date: "Tanggal —",
    detail:
      "Kalender akademik resmi Universitas LIA mencakup jadwal registrasi ulang, periode perkuliahan, Ujian Tengah Semester (UTS), Ujian Akhir Semester (UAS), serta batas akhir pengisian KRS.",
  },
  {
    id: "layanan-administrasi",
    category: "ADMINISTRASI",
    categoryLabel: "Administrasi",
    title: "Informasi layanan administrasi",
    description: "Persyaratan, alur layanan, dan dokumen terkait akan tersedia di sini.",
    date: "Tanggal —",
    detail:
      "Layanan administrasi mencakup permohonan surat keterangan aktif kuliah, legalisasi ijazah & transkrip, pengajuan cuti akademik, dan administrasi keuangan mahasiswa.",
  },
  {
    id: "untuk-mahasiswa",
    category: "KEMAHASISWAAN",
    categoryLabel: "Kemahasiswaan",
    title: "Informasi untuk mahasiswa",
    description: "Pemberitahuan resmi dan informasi kegiatan mahasiswa.",
    date: "Tanggal —",
    detail:
      "Informasi mengenai kegiatan pembinaan minat & bakat mahasiswa, kepengurusan ormawa/UKM, beasiswa prestasi, serta pengumuman kompetisi tingkat wilayah dan nasional.",
  },
  {
    id: "penerimaan-mhs-baru",
    category: "PENERIMAAN",
    categoryLabel: "Kemahasiswaan", // Or accessible via Semua
    title: "Informasi penerimaan mahasiswa baru",
    description: "Informasi resmi terkait proses dan jadwal PMB.",
    date: "Tanggal —",
    detail:
      "Informasi jalur pendaftaran mahasiswa baru Universitas LIA untuk Program Sarjana (S1) dan Diploma (D3), termasuk jalur reguler, prestasi, dan beasiswa kemitraan.",
  },
];

export function PengumumanList() {
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<PengumumanItem | null>(null);
  const searchInputId = useId();

  const filteredItems = useMemo(() => {
    return PENGUMUMAN_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "semua" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === "kemahasiswaan" && item.category === "PENERIMAAN");

      const matchQuery =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="pengumuman-content-area">
      {/* Header section: Daftar pengumuman */}
      <div className="pengumuman-section-header">
        <h2 className="pengumuman-section-title" id="pengumuman-list-title">
          Daftar pengumuman
        </h2>
        <p className="pengumuman-section-desc">
          Gunakan kategori untuk menemukan informasi yang dibutuhkan.
        </p>
      </div>

      {/* Filter bar */}
      <div className="pengumuman-filter-bar">
        <div
          aria-label="Filter kategori pengumuman"
          className="pengumuman-category-pills"
          role="tablist"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                aria-selected={isSelected}
                className={`pengumuman-pill ${isSelected ? "is-active" : ""}`}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                role="tab"
                type="button"
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="pengumuman-search-wrap">
          <label className="sr-only" htmlFor={searchInputId}>
            Cari pengumuman
          </label>
          <input
            className="pengumuman-search-input"
            id={searchInputId}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengumuman..."
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Announcement List Items */}
      {filteredItems.length === 0 ? (
        <div className="pengumuman-empty-state">
          <p>Tidak ada pengumuman yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="pengumuman-items-list">
          {filteredItems.map((item) => (
            <article
              className="pengumuman-card"
              key={item.id}
              onClick={() => setActiveModalItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveModalItem(item);
                }
              }}
            >
              <div className="pengumuman-card-main">
                <span className="pengumuman-card-category">{item.category}</span>
                <h3 className="pengumuman-card-title">{item.title}</h3>
                <p className="pengumuman-card-desc">{item.description}</p>
              </div>
              <div className="pengumuman-card-meta">
                <span>{item.date}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Bottom Info / Help Box */}
      <section aria-labelledby="pengumuman-bantuan-title" className="pengumuman-footer-notice">
        <h3 className="pengumuman-footer-notice-title" id="pengumuman-bantuan-title">
          Butuh konfirmasi informasi?
        </h3>
        <p className="pengumuman-footer-notice-desc">
          Gunakan kanal komunikasi resmi Universitas LIA untuk memastikan detail pengumuman.
        </p>
      </section>

      {/* Modal Detail Pengumuman */}
      {activeModalItem && (
        <div
          aria-labelledby="modal-pengumuman-title"
          aria-modal="true"
          className="pengumuman-modal-backdrop"
          onClick={() => setActiveModalItem(null)}
          role="dialog"
        >
          <div
            className="pengumuman-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pengumuman-modal-header">
              <div>
                <span className="pengumuman-card-category">{activeModalItem.category}</span>
                <h4 className="pengumuman-modal-title" id="modal-pengumuman-title">
                  {activeModalItem.title}
                </h4>
                <span className="pengumuman-modal-date">{activeModalItem.date}</span>
              </div>
              <button
                aria-label="Tutup jendela modal"
                className="pengumuman-modal-close"
                onClick={() => setActiveModalItem(null)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="pengumuman-modal-body">
              <p className="pengumuman-modal-desc">{activeModalItem.description}</p>
              {activeModalItem.detail && (
                <div className="pengumuman-modal-detail-box">
                  <p>{activeModalItem.detail}</p>
                </div>
              )}
              <div className="pengumuman-modal-contact-info">
                <strong>Kontak Layanan:</strong>
                <p>
                  Untuk konfirmasi resmi lebih lanjut, silakan hubungi bagian kemahasiswaan atau biro terkait melalui email:{" "}
                  <a href="mailto:humas@universitaslia.ac.id">humas@universitaslia.ac.id</a>
                </p>
              </div>
            </div>

            <div className="pengumuman-modal-footer">
              <button
                className="pengumuman-modal-btn-close"
                onClick={() => setActiveModalItem(null)}
                type="button"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

