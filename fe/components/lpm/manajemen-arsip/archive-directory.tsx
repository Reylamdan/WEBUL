
"use client";

import { useEffect, useState } from "react";
import {
  errorMessage,
  formatDate,
  resolveApiUrl,
} from "@/lib/api";
import {
  lpmArchiveApi,
  type ArchiveCategory,
  type ArchiveDocument,
} from "@/lib/lpm-archive-api";

const pageSize = 5;

export function ArchiveDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [archives, setArchives] = useState<ArchiveDocument[]>([]);
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    lpmArchiveApi
      .filterOptions()
      .then((result) => {
        if (!active) return;
        setCategories(result.categories);
        setYears(result.years);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    const timeout = setTimeout(() => {
      lpmArchiveApi
        .list({
          page: currentPage,
          limit: pageSize,
          search: query.trim() || undefined,
          category: category || undefined,
          year: year ? Number(year) : undefined,
        })
        .then((result) => {
          if (controller.signal.aborted) return;

          setArchives(result.items);
          setTotal(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;

          setError(errorMessage(err));
          setArchives([]);
          setTotal(0);
          setTotalPages(0);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, category, year, currentPage]);

  const firstItem = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, total);
  const hasActiveFilters = Boolean(query || category || year);

  function resetFilters() {
    setQuery("");
    setCategory("");
    setYear("");
    setCurrentPage(1);
  }

  function getFileType(archive: ArchiveDocument) {
    return archive.fileType ?? "Dokumen";
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
            <p>
              Cari dan telusuri dokumen berdasarkan kategori atau tahun.
            </p>
          </div>
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
              {categories.map((archiveCategory) => (
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
          Menampilkan{" "}
          <strong>
            {firstItem}–{lastItem}
          </strong>{" "}
          dari <strong>{total}</strong> dokumen
        </div>

        {loading ? (
          <p className="lpm-archive-empty" role="status">
            Memuat dokumen arsip...
          </p>
        ) : error ? (
          <p className="lpm-archive-empty" role="alert">
            {error}
          </p>
        ) : archives.length > 0 ? (
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
              aria-label="Daftar dokumen arsip"
              className="lpm-archive-list"
            >
              {archives.map((archive, index) => {
                const previewUrl = resolveApiUrl(archive.file?.url);
                const downloadUrl = resolveApiUrl(
                  archive.file?.downloadUrl,
                );

                return (
                  <li className="lpm-archive-row" key={archive.id}>
                    <span
                      aria-hidden="true"
                      className="lpm-archive-row-number"
                    >
                      {String(firstItem + index).padStart(2, "0")}
                    </span>

                    <div className="lpm-archive-document">
                      <h3>{archive.title}</h3>
                      <p>{archive.description}</p>

                      {archive.fileName ? (
                        <span className="lpm-archive-file-name">
                          Nama berkas: <code>{archive.fileName}</code>
                        </span>
                      ) : null}

                      {(previewUrl || downloadUrl) && (
                        <div className="lpm-archive-file-actions">
                          {previewUrl && (
                            <a
                              className="lpm-archive-action lpm-archive-action-preview"
                              href={previewUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                              aria-label={`Pratinjau dokumen ${archive.title}`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="3"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                />
                              </svg>
                              <span>Pratinjau</span>
                            </a>
                          )}

                          {downloadUrl && (
                            <a
                              className="lpm-archive-action lpm-archive-action-download"
                              href={downloadUrl}
                              aria-label={`Unduh dokumen ${archive.title}`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M12 3.5v11m0 0 4-4m-4 4-4-4M4.5 16v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>Unduh dokumen</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lpm-archive-metadata">
                      <span className="lpm-archive-category">
                        {archive.category}
                      </span>
                      <span className="lpm-archive-year">
                        {archive.year}
                      </span>
                      <time
                        className="lpm-archive-date"
                        dateTime={archive.date}
                      >
                        {formatDate(archive.date)}
                      </time>
                      <span className="lpm-archive-type">
                        {getFileType(archive)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className="lpm-archive-empty" role="status">
            Dokumen tidak ditemukan. Coba ubah kata kunci atau filter.
          </p>
        )}

        {!loading && !error && totalPages > 1 ? (
          <nav
            aria-label="Halaman daftar arsip"
            className="lpm-archive-pagination"
          >
            <button
              aria-label="Halaman sebelumnya"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              type="button"
            >
              Sebelumnya
            </button>

            <span>
              Halaman <strong>{currentPage}</strong> dari{" "}
              <strong>{totalPages}</strong>
            </span>

            <button
              aria-label="Halaman berikutnya"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              type="button"
            >
              Berikutnya
            </button>
          </nav>
        ) : null}
      </div>

      <style jsx>{`
        .lpm-archive-file-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }

        .lpm-archive-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 17px;
          border: 1px solid transparent;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          text-decoration: none;
          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .lpm-archive-action svg {
          width: 17px;
          height: 17px;
          flex: 0 0 17px;
        }

        .lpm-archive-action-preview {
          color: #315c45;
          background: #ffffff;
          border-color: #d9e2dc;
        }

        .lpm-archive-action-preview:hover {
          color: #1f352a;
          background: #f2f6f3;
          border-color: #9db5a5;
          transform: translateY(-1px);
        }

        .lpm-archive-action-download {
          color: #ffffff;
          background: #315c45;
          border-color: #315c45;
        }

        .lpm-archive-action-download:hover {
          color: #ffffff;
          background: #1f352a;
          border-color: #1f352a;
          box-shadow: 0 4px 12px rgba(31, 53, 42, 0.16);
          transform: translateY(-1px);
        }

        .lpm-archive-action:focus-visible {
          outline: 3px solid rgba(49, 92, 69, 0.25);
          outline-offset: 3px;
        }

        @media (max-width: 480px) {
          .lpm-archive-file-actions {
            gap: 8px;
          }

          .lpm-archive-action {
            min-height: 40px;
            padding: 0 13px;
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lpm-archive-action {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
