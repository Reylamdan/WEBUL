"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { errorMessage, formatDate, newsApi } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";

// Backend belum memiliki field kategori berita. Pilihan kategori dipakai sebagai kata kunci
// pencarian (judul/ringkasan) bila kolom cari kosong.
const CATEGORIES = ["Semua", "Kampus", "Prestasi", "Universitas"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

// Backend membatasi maksimal 50 data per permintaan.
const PAGE_LIMIT = 50;

export function BeritaJelajahi() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();
  const debouncedQuery = useDebouncedValue(searchQuery.trim());
  const search = debouncedQuery || (selectedCategory === "Semua" ? "" : selectedCategory);

  const { data, error, loading } = useApi(`berita-list:${search}`, () =>
    newsApi.list({ page: 1, limit: PAGE_LIMIT, search: search || undefined }),
  );
  const items = data?.items ?? [];

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

      {error && items.length === 0 ? (
        <div className="berita-empty-state" role="alert">
          <p>{errorMessage(error)}</p>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="berita-empty-state" aria-live="polite">
          <p>Memuat berita...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="berita-empty-state">
          <p>Tidak ada berita yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="berita-grid">
          {items.map((item) => (
            <article className="berita-card" key={item.id}>
              <div aria-hidden="true" className="berita-card-image">
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" loading="lazy" src={item.coverImageUrl} />
                ) : (
                  <span className="berita-placeholder-hint">Foto berita</span>
                )}
              </div>
              <div className="berita-card-content">
                <span className="berita-card-eyebrow">BERITA</span>
                <h3 className="berita-card-title">{item.title}</h3>
                {item.excerpt && <p className="berita-card-desc">{item.excerpt}</p>}
                <div className="berita-card-meta">
                  <span>{[formatDate(item.publishedAt), item.author?.name].filter(Boolean).join(" · ")}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

