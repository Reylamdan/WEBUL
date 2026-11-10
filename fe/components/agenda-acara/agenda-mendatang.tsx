"use client";

import { useId, useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Icon } from "@/components/icons";
import { AgendaCard, AgendaCardProps } from "./agenda-card";

const AGENDA_ITEMS: AgendaCardProps[] = [
  {
    id: "seminar-1",
    category: "Seminar",
    dateDay: "--",
    dateMonth: "BULAN",
    title: "Seminar dan diskusi akademik",
    description: "Tempat untuk ringkasan acara dan informasi pembicara.",
    meta: "Waktu · Lokasi",
  },
  {
    id: "kampus-1",
    category: "Kampus",
    dateDay: "--",
    dateMonth: "BULAN",
    title: "Kegiatan komunitas kampus",
    description: "Informasi kegiatan bersama mahasiswa dan komunitas.",
    meta: "Waktu · Lokasi",
  },
  {
    id: "mahasiswa-1",
    category: "Mahasiswa",
    dateDay: "--",
    dateMonth: "BULAN",
    title: "Workshop dan pengembangan diri",
    description: "Detail kegiatan, jadwal, dan cara mengikuti acara.",
    meta: "Waktu · Lokasi",
  },
];

const CATEGORIES = ["Semua acara", "Seminar", "Kampus", "Mahasiswa"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function AgendaMendatang() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Semua acara");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();

  const filteredItems = useMemo(() => {
    return AGENDA_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua acara" || item.category === selectedCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <ScrollReveal delay={140}>
      <section aria-labelledby="agenda-mendatang-title" className="agenda-section agenda-wrap">
        <div className="agenda-section-header">
          <h2 className="agenda-section-title" id="agenda-mendatang-title">
            Agenda mendatang
          </h2>
          <p className="agenda-section-desc">
            Tanggal, lokasi, dan status pendaftaran akan diperbarui berdasarkan informasi resmi.
          </p>
        </div>

        <div className="agenda-filter-bar">
          <div aria-label="Filter kategori acara" className="agenda-category-pills" role="tablist">
            {CATEGORIES.map((cat) => (
              <button
                aria-selected={selectedCategory === cat}
                className={`agenda-pill ${selectedCategory === cat ? "is-active" : ""}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                role="tab"
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="agenda-search-wrap">
            <span aria-hidden="true" className="agenda-search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              aria-label="Cari acara"
              className="agenda-search-input"
              id={searchInputId}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari acara..."
              type="search"
              value={searchQuery}
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="agenda-empty-state">
            <p>Tidak ada agenda acara yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
          <div className="agenda-grid">
            {filteredItems.map((item) => (
              <AgendaCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </section>
    </ScrollReveal>
  );
}

