"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

interface BeritaItem {
  id: string;
  category: "Kampus" | "Prestasi" | "Universitas";
  title: string;
  description: string;
  meta: string;
}

const BERITA_ITEMS: BeritaItem[] = [
  {
    id: "kampus",
    category: "Kampus",
    title: "Aktivitas dan kehidupan kampus",
    description: "Ringkasan berita akan ditampilkan setelah konten resmi tersedia.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "prestasi",
    category: "Prestasi",
    title: "Prestasi mahasiswa dan dosen",
    description: "Cerita pencapaian, kolaborasi, dan karya sivitas akademika.",
    meta: "Tanggal / informasi selengkapnya",
  },
  {
    id: "universitas",
    category: "Universitas",
    title: "Informasi dan perkembangan",
    description: "Kabar kelembagaan dan informasi resmi yang relevan bagi pembaca.",
    meta: "Tanggal / informasi selengkapnya",
  },
];

const CATEGORIES = ["Semua", "Kampus", "Prestasi", "Universitas"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function BeritaJelajahi() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();

  const filteredItems = useMemo(() => {
    return BERITA_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section aria-labelledby="berita-jelajahi-title" className="berita-jelajahi-section berita-wrap">
      <div className="berita-section-header">
        <h2 className="berita-section-title" id="berita-jelajahi-title">
          Jelajahi berita
        </h2>
        <p className="berita-section-desc">
          Telusuri berita berdasarkan kategori atau kata kunci.
        </p>
      </div>

      <div className="berita-filter-bar">
        <div className="berita-search-wrap">
          <label className="sr-only" htmlFor={searchInputId}>
            Cari berita atau kata kunci
          </label>
          <span aria-hidden="true" className="berita-search-icon">
            <Icon name="search" size={16} />
          </span>
          <input
            className="berita-search-input"
            id={searchInputId}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berita atau kata kunci..."
            type="search"
            value={searchQuery}
          />
        </div>

        <div aria-label="Filter kategori berita" className="berita-category-pills" role="tablist">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                aria-selected={isSelected}
                className={`berita-pill ${isSelected ? "is-active" : ""}`}
                key={category}
                onClick={() => setSelectedCategory(category)}
                role="tab"
                type="button"
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="berita-empty-state">
          <p>Tidak ada berita yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="berita-grid">
          {filteredItems.map((item) => (
            <article className="berita-card" key={item.id}>
              <div aria-hidden="true" className="berita-card-image">
                <span className="berita-placeholder-hint">Foto berita — isi nanti</span>
              </div>
              <div className="berita-card-content">
                <span className="berita-card-eyebrow">{item.category.toUpperCase()}</span>
                <h3 className="berita-card-title">{item.title}</h3>
                <p className="berita-card-desc">{item.description}</p>
                <div className="berita-card-meta">
                  <span>{item.meta}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

