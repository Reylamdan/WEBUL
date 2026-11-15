"use client";

import { useId, useState } from "react";
import { ContentLanguageToggle } from "@/components/content-language-toggle";
import { Icon } from "@/components/icons";
import { announcementApi, errorMessage, formatDate, type AnnouncementItem } from "@/lib/api";
import { categoryLabel, useContentLang } from "@/lib/content-language";
import { useApi, useDebouncedValue } from "@/lib/use-api";

const ALL = "Semua";

// Backend membatasi maksimal 50 data per permintaan.
const PAGE_LIMIT = 50;

function AnnouncementDetail({ slug, fallback }: { slug: string; fallback: string | null }) {
  const [lang] = useContentLang();
  const { data, error, loading } = useApi(`pengumuman-detail:${lang}:${slug}`, () => announcementApi.detail(slug, lang));

  if (loading) return <p className="pengumuman-modal-desc">Memuat detail pengumuman...</p>;
  if (error) {
    return (
      <>
        {fallback && <p className="pengumuman-modal-desc">{fallback}</p>}
        <p className="pengumuman-modal-desc" role="alert">
          {errorMessage(error)}
        </p>
      </>
    );
  }
  return (
    <>
      {data?.excerpt && <p className="pengumuman-modal-desc">{data.excerpt}</p>}
      {data?.contentHtml && (
        <div
          className="pengumuman-modal-detail-box"
          // Isi pengumuman sudah disanitasi oleh backend (sanitize-html) sebelum disimpan.
          dangerouslySetInnerHTML={{ __html: data.contentHtml }}
        />
      )}
    </>
  );
}

export function PengumumanList() {
  const [lang] = useContentLang();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<AnnouncementItem | null>(null);
  const searchInputId = useId();
  const debouncedQuery = useDebouncedValue(searchQuery.trim());
  const category = selectedCategory === ALL ? undefined : selectedCategory;

  // Daftar kategori berasal dari backend (GET /api/announcements/categories); filter dilakukan di server.
  const categories = useApi("pengumuman-categories", () => announcementApi.categories());
  const categoryOptions = [ALL, ...(categories.data ?? [])];

  const { data, error, loading } = useApi(`pengumuman-list:${lang}:${category ?? ""}:${debouncedQuery}`, () =>
    announcementApi.list({ page: 1, limit: PAGE_LIMIT, search: debouncedQuery || undefined, category, lang }),
  );
  const items = data?.items ?? [];

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
          {categoryOptions.map((option) => {
            const isSelected = selectedCategory === option;
            return (
              <button
                aria-selected={isSelected}
                className={`pengumuman-pill ${isSelected ? "is-active" : ""}`}
                key={option}
                onClick={() => setSelectedCategory(option)}
                role="tab"
                type="button"
              >
                {option === ALL ? "Semua pengumuman" : categoryLabel(option, lang)}
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

      <ContentLanguageToggle pillClass="pengumuman-pill" />

      {/* Announcement List Items */}
      {error && items.length === 0 ? (
        <div className="pengumuman-empty-state" role="alert">
          <p>{errorMessage(error)}</p>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="pengumuman-empty-state" aria-live="polite">
          <p>Memuat pengumuman...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="pengumuman-empty-state">
          <p>Tidak ada pengumuman yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="pengumuman-items-list">
          {items.map((item) => (
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
                <span className="pengumuman-card-category">{(item.category ? categoryLabel(item.category, lang) : "PENGUMUMAN").toUpperCase()}</span>
                <h3 className="pengumuman-card-title">{item.title}</h3>
                {item.excerpt && <p className="pengumuman-card-desc">{item.excerpt}</p>}
              </div>
              <div className="pengumuman-card-meta">
                <span>{[formatDate(item.publishedAt, lang), lang === "en" && item.translated === false ? "Indonesian only" : ""].filter(Boolean).join(" · ")}</span>
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
                <span className="pengumuman-card-category">{(activeModalItem.category ? categoryLabel(activeModalItem.category, lang) : "PENGUMUMAN").toUpperCase()}</span>
                <h4 className="pengumuman-modal-title" id="modal-pengumuman-title">
                  {activeModalItem.title}
                </h4>
                <span className="pengumuman-modal-date">{formatDate(activeModalItem.publishedAt, lang)}</span>
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
              <AnnouncementDetail fallback={activeModalItem.excerpt} slug={activeModalItem.slug} />
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

