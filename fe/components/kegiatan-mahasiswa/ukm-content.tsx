"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useApi } from "@/lib/use-api";
import { ukmApi, type UkmCategory, type UkmItemData } from "@/lib/api";

const DEFAULT_CATEGORIES: UkmCategory[] = [
  { id: "seni", label: "Seni & Kreativitas" },
  { id: "olahraga", label: "Olahraga" },
  { id: "teknologi", label: "Teknologi" },
  { id: "organisasi", label: "Organisasi" },
  { id: "sosial", label: "Sosial & Kerohanian" },
];

const DEFAULT_ITEMS: UkmItemData[] = [
  {
    id: "default-ukm-1",
    title: "Seni dan kreativitas",
    category: "seni",
    categoryLabel: "Seni & Kreativitas",
    description: "Ruang untuk berekspresi melalui karya, pertunjukan, dan kegiatan kreatif.",
    meta: "Tanggal / informasi selengkapnya",
    sortOrder: 1,
  },
  {
    id: "default-ukm-2",
    title: "Olahraga dan kebugaran",
    category: "olahraga",
    categoryLabel: "Olahraga",
    description: "Bangun kerja sama tim, disiplin, dan semangat sportif melalui aktivitas olahraga.",
    meta: "Tanggal / informasi selengkapnya",
    sortOrder: 2,
  },
  {
    id: "default-ukm-3",
    title: "Teknologi dan komunitas",
    category: "teknologi",
    categoryLabel: "Teknologi",
    description: "Berbagi pengetahuan, mengembangkan keterampilan, dan mencoba ide baru bersama.",
    meta: "Tanggal / informasi selengkapnya",
    sortOrder: 3,
  },
  {
    id: "default-ukm-4",
    title: "Organisasi dan kepemimpinan",
    category: "organisasi",
    categoryLabel: "Organisasi",
    description: "Kembangkan jiwa kepemimpinan, manajemen organisasi, dan jejaring kolaboratif.",
    meta: "Tanggal / informasi selengkapnya",
    sortOrder: 4,
  },
  {
    id: "default-ukm-5",
    title: "Sosial dan kerohanian",
    category: "sosial",
    categoryLabel: "Sosial & Kerohanian",
    description: "Menumbuhkan empati sosial, kebersamaan, dan pembinaan nilai-nilai spiritual di kampus.",
    meta: "Tanggal / informasi selengkapnya",
    sortOrder: 5,
  },
];

export function UkmContent() {
  const { data } = useApi("public-ukm", () => ukmApi.get());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const s = data?.settings;
  const introEyebrow = s?.introEyebrow || "KOMUNITAS MAHASISWA";
  const introTitle = s?.introTitle || "Temukan komunitas yang sesuai dengan minatmu";
  const introDescription =
    s?.introDescription ||
    "UKM menjadi ruang untuk belajar bersama, mengasah kemampuan, dan menciptakan pengalaman kampus yang berkesan.";
  const categoryTitle = s?.categoryTitle || "Jelajahi bidang kegiatan";
  const categoryDesc = s?.categoryDesc || "Pilih bidang yang paling dekat dengan minat dan ketertarikanmu.";
  const cardsTitle = s?.cardsTitle || "Kenali komunitas mahasiswa";
  const cardsDesc =
    s?.cardsDesc || "Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi setelah data resmi tersedia.";

  const categories = data?.categories && data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES;
  const allItems = data?.items && data.items.length > 0 ? data.items : DEFAULT_ITEMS;

  const displayedItems = useMemo(() => {
    if (!activeCategory) {
      return allItems;
    }
    const filtered = allItems.filter((item) => item.category === activeCategory);
    return filtered.length > 0 ? filtered : allItems;
  }, [activeCategory, allItems]);

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
        <span className="ukm-eyebrow-sub">{introEyebrow}</span>
        <h2 className="ukm-section-main-title" id="ukm-minat-title">
          {introTitle}
        </h2>
        <p className="ukm-section-main-desc">{introDescription}</p>
      </section>

      {/* Section: Jelajahi bidang kegiatan */}
      <section aria-labelledby="ukm-bidang-title" className="ukm-bidang-section">
        <h3 className="ukm-sub-title" id="ukm-bidang-title">
          {categoryTitle}
        </h3>
        <p className="ukm-sub-desc">{categoryDesc}</p>

        <div aria-label="Bidang Kegiatan UKM" className="ukm-pills-row" role="tablist">
          {categories.map((cat) => {
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
          {cardsTitle}
        </h3>
        <p className="ukm-sub-desc">{cardsDesc}</p>

        <div className="ukm-cards-grid">
          {displayedItems.map((item) => (
            <article className="ukm-card" key={item.id}>
              <div aria-hidden="true" className="ukm-card-header">
                {item.imageUrl ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <Image
                      alt={item.title}
                      className="ukm-card-image"
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      src={item.imageUrl}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div className="ukm-card-image-placeholder">
                    <span className="ukm-card-hint">Dokumentasi kegiatan</span>
                  </div>
                )}
              </div>
              <div className="ukm-card-body">
                <span className="ukm-card-tag">{item.categoryLabel || "UKM"}</span>
                <h4 className="ukm-card-title">{item.title}</h4>
                <p className="ukm-card-desc">{item.description}</p>
                {item.meta && (
                  <div className="ukm-card-footer">
                    <span>{item.meta}</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
