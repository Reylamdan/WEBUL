"use client";

import { useId, useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Icon } from "@/components/icons";
import { calendarApi, dateParts, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { AgendaCard } from "./agenda-card";
import { eventDateRange, fetchUpcomingEvents } from "./agenda-data";

const ALL_CATEGORIES = "Semua acara";

export function AgendaMendatang() {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();

  const events = useApi("agenda-upcoming", fetchUpcomingEvents);
  const categoriesResult = useApi("agenda-categories", calendarApi.categories);
  const categories = [ALL_CATEGORIES, ...(categoriesResult.data?.map((c) => c.name) ?? [])];

  const items = events.data?.items;
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      const matchCategory = selectedCategory === ALL_CATEGORIES || item.category.name === selectedCategory;
      const matchSearch =
        query === "" ||
        item.title.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query) ||
        item.category.name.toLowerCase().includes(query);
      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

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
            {categories.map((cat) => (
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

        {events.error && !items ? (
          <div className="agenda-empty-state" role="alert">
            <p>{errorMessage(events.error)}</p>
          </div>
        ) : events.loading && !items ? (
          <div className="agenda-empty-state" aria-live="polite">
            <p>Memuat agenda acara...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="agenda-empty-state">
            <p>Tidak ada agenda acara yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
          <div className="agenda-grid">
            {filteredItems.map((item) => {
              const { day, month } = dateParts(item.startDate);
              return (
                <AgendaCard
                  category={item.category.name}
                  dateDay={day}
                  dateMonth={month}
                  description={item.description ?? ""}
                  id={item.id}
                  key={item.id}
                  meta={eventDateRange(item)}
                  title={item.title}
                />
              );
            })}
          </div>
        )}
      </section>
    </ScrollReveal>
  );
}

