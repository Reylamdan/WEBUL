"use client";

import { useMemo, useState } from "react";

export interface UkmItem {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  meta: string;
}

const UKM_CATEGORIES = [
  { id: "seni", label: "Seni & Kreativitas" },
  { id: "olahraga", label: "Olahraga" },
  { id: "teknologi", label: "Teknologi" },
  { id: "organisasi", label: "Organisasi" },
  { id: "sosial", label: "Sosial & Kerohanian" },
] as const;

const UKM_ITEMS: UkmItem[] = [
  {
    id: "seni",
    category: "seni",
    categoryLabel: "Seni & Kreativitas",
    title: "Seni dan kreativitas",
    description: "Ruang untuk berekspresi melalui karya, pertunjukan, dan kegiatan kreatif.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "olahraga",
    category: "olahraga",
    categoryLabel: "Olahraga",
    title: "Olahraga dan kebugaran",
    description: "Bangun kerja sama tim, disiplin, dan semangat sportif melalui aktivitas olahraga.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "teknologi",
    category: "teknologi",
    categoryLabel: "Teknologi",
    title: "Teknologi dan komunitas",
    description: "Berbagi pengetahuan, mengembangkan keterampilan, dan mencoba ide baru bersama.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "organisasi",
    category: "organisasi",
    categoryLabel: "Organisasi",
    title: "Organisasi dan kepemimpinan",
    description: "Kembangkan jiwa kepemimpinan, manajemen organisasi, dan jejaring kolaboratif.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "sosial",
    category: "sosial",
    categoryLabel: "Sosial & Kerohanian",
    title: "Sosial dan kerohanian",
    description: "Menumbuhkan empati sosial, kebersamaan, dan pembinaan nilai-nilai spiritual di kampus.",
    meta: "Tanggal / informasi selengkapnya",
  },
];

export function UkmContent() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const displayedItems = useMemo(() => {
    if (!activeCategory) {
      // By default show all or the primary 3 featured cards matching the mockup
      return UKM_ITEMS.slice(0, 3);
    }
    const filtered = UKM_ITEMS.filter((item) => item.category === activeCategory);
    return filtered.length > 0 ? filtered : UKM_ITEMS.slice(0, 3);
  }, [activeCategory]);

  const handlePillClick = (categoryId: string) => {
    if (activeCategory === categoryId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryId);
    }
  };

  return (
    <div className="ukm-content-area">
      {/* Section: Temukan komunitas yang sesuai dengan minatmu */}
      <section aria-labelledby="ukm-minat-title" className="ukm-intro-section">
        <span className="ukm-eyebrow-sub">KOMUNITAS MAHASISWA</span>
        <h2 className="ukm-section-main-title" id="ukm-minat-title">
          Temukan komunitas yang sesuai dengan minatmu
        </h2>
        <p className="ukm-section-main-desc">
          UKM menjadi ruang untuk belajar bersama, mengasah kemampuan, dan menciptakan pengalaman kampus yang berkesan.
        </p>
      </section>

      {/* Section: Jelajahi bidang kegiatan */}
      <section aria-labelledby="ukm-bidang-title" className="ukm-bidang-section">
        <h3 className="ukm-sub-title" id="ukm-bidang-title">
          Jelajahi bidang kegiatan
        </h3>
        <p className="ukm-sub-desc">
          Pilih bidang yang paling dekat dengan minat dan ketertarikanmu.
        </p>

        <div aria-label="Bidang Kegiatan UKM" className="ukm-pills-row" role="tablist">
          {UKM_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                aria-pressed={isSelected}
                className={`ukm-pill-button ${isSelected ? "is-active" : ""}`}
                key={cat.id}
                onClick={() => handlePillClick(cat.id)}
                type="button"
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Section: Kenali komunitas mahasiswa */}
      <section aria-labelledby="ukm-komunitas-title" className="ukm-komunitas-section">
        <h3 className="ukm-sub-title" id="ukm-komunitas-title">
          Kenali komunitas mahasiswa
        </h3>
        <p className="ukm-sub-desc">
          Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi setelah data resmi tersedia.
        </p>

        <div className="ukm-cards-grid">
          {displayedItems.map((item) => (
            <article className="ukm-card" key={item.id}>
              <div aria-hidden="true" className="ukm-card-header">
                <div className="ukm-card-image-placeholder">
                  <span className="ukm-card-hint">Dokumentasi kegiatan</span>
                </div>
              </div>
              <div className="ukm-card-body">
                <span className="ukm-card-tag">UKM</span>
                <h4 className="ukm-card-title">{item.title}</h4>
                <p className="ukm-card-desc">{item.description}</p>
                <div className="ukm-card-footer">
                  <span>{item.meta}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

