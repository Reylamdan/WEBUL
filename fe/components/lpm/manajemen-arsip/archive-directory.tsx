"use client";

import { useMemo, useState } from "react";
import {
  archiveCategories,
  archiveDocuments,
  type ArchiveDocument,
} from "./archive-data";

const pageSize = 5;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ArchiveRow({
  archive,
  index,
}: {
  archive: ArchiveDocument;
  index: number;
}) {
  return (
    <li className="lpm-archive-row">
      <span aria-hidden="true" className="lpm-archive-row-number">
        {String(index).padStart(2, "0")}
      </span>
      <div className="lpm-archive-document">
        <h3>{archive.title}</h3>
        <p>{archive.description}</p>
        <span className="lpm-archive-file-name">
          Nama berkas contoh: <code>{archive.fileName}</code>
        </span>
      </div>
      <div className="lpm-archive-metadata">
        <span className="lpm-archive-category">{archive.category}</span>
        <span className="lpm-archive-year">{archive.year}</span>
        <time className="lpm-archive-date" dateTime={archive.date}>
          {dateFormatter.format(new Date(`${archive.date}T00:00:00`))}
        </time>
        <span className="lpm-archive-type">{archive.fileType}</span>
      </div>
    </li>
  );
}

export function ArchiveDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const years = useMemo(
    () => [...new Set(archiveDocuments.map((archive) => archive.year))].sort(
      (left, right) => right - left,
    ),
    [],
  );

  const filteredArchives = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");

    return archiveDocuments.filter((archive) => {
      const matchesQuery =
        !normalizedQuery ||
        `${archive.title} ${archive.fileName}`
          .toLocaleLowerCase("id")
          .includes(normalizedQuery);
      const matchesCategory = !category || archive.category === category;
      const matchesYear = !year || archive.year === Number(year);

      return matchesQuery && matchesCategory && matchesYear;
    });
  }, [category, query, year]);

  const pageCount = Math.ceil(filteredArchives.length / pageSize);
  const page = Math.min(currentPage, Math.max(pageCount, 1));
  const firstItem = filteredArchives.length ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, filteredArchives.length);
  const visibleArchives = filteredArchives.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const hasActiveFilters = Boolean(query || category || year);

  function resetFilters() {
    setQuery("");
    setCategory("");
    setYear("");
    setCurrentPage(1);
  }

  return (
    <section
      aria-labelledby="archive-directory-title"
      className="lpm-archive-directory"
    >
      <div className="content-wrap">
        <div className="lpm-archive-directory-heading">
          <div>
            <span className="lpm-archive-eyebrow">JELAJAHI ARSIP</span>
            <h2 id="archive-directory-title">Daftar dokumen</h2>
            <p>Cari dan telusuri contoh dokumen berdasarkan kategori atau tahun.</p>
          </div>
          <p className="lpm-archive-sample-notice">
            Data simulasi untuk pratinjau — bukan dokumen resmi Universitas LIA.
          </p>
        </div>

        <div aria-label="Filter arsip" className="lpm-archive-filters">
          <label className="lpm-archive-search">
            <span className="lpm-archive-filter-label">Cari dokumen</span>
            <span className="lpm-archive-search-field">
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <circle cx="8.75" cy="8.75" r="5.75" />
                <path d="m13 13 4 4" />
              </svg>
              <input
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Masukkan judul atau nama berkas"
                type="search"
                value={query}
              />
            </span>
          </label>
          <label className="lpm-archive-select">
            <span className="lpm-archive-filter-label">Kategori</span>
            <select
              onChange={(event) => {
                setCategory(event.target.value);
                setCurrentPage(1);
              }}
              value={category}
            >
              <option value="">Semua kategori</option>
              {archiveCategories.map((archiveCategory) => (
                <option key={archiveCategory} value={archiveCategory}>
                  {archiveCategory}
                </option>
              ))}
            </select>
          </label>
          <label className="lpm-archive-select">
            <span className="lpm-archive-filter-label">Tahun</span>
            <select
              onChange={(event) => {
                setYear(event.target.value);
                setCurrentPage(1);
              }}
              value={year}
            >
              <option value="">Semua tahun</option>
              {years.map((archiveYear) => (
                <option key={archiveYear} value={archiveYear}>
                  {archiveYear}
                </option>
              ))}
            </select>
          </label>
          <button
            className="lpm-archive-reset"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
            type="button"
          >
            Reset filter
          </button>
        </div>

        <div className="lpm-archive-results" aria-live="polite">
          Menampilkan <strong>{firstItem}–{lastItem}</strong> dari{" "}
          <strong>{filteredArchives.length}</strong> dokumen contoh
        </div>

        {visibleArchives.length > 0 ? (
          <>
            <div aria-hidden="true" className="lpm-archive-list-header">
              <span>No.</span>
              <span>Dokumen</span>
              <span>Kategori</span>
              <span>Tahun</span>
              <span>Tanggal</span>
              <span>Format</span>
            </div>
            <ol
              aria-label="Daftar dokumen arsip simulasi"
              className="lpm-archive-list"
            >
              {visibleArchives.map((archive, index) => (
                <ArchiveRow
                  archive={archive}
                  index={(page - 1) * pageSize + index + 1}
                  key={archive.id}
                />
              ))}
            </ol>
          </>
        ) : (
          <p className="lpm-archive-empty" role="status">
            Dokumen tidak ditemukan. Coba ubah kata kunci atau filter.
          </p>
        )}

        {pageCount > 1 ? (
          <nav
            aria-label="Halaman daftar arsip"
            className="lpm-archive-pagination"
          >
            <button
              aria-label="Halaman sebelumnya"
              disabled={page === 1}
              onClick={() => setCurrentPage(page - 1)}
              type="button"
            >
              Sebelumnya
            </button>
            <span>
              Halaman <strong>{page}</strong> dari <strong>{pageCount}</strong>
            </span>
            <button
              aria-label="Halaman berikutnya"
              disabled={page === pageCount}
              onClick={() => setCurrentPage(page + 1)}
              type="button"
            >
              Berikutnya
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
