"use client";

import { useId, useState } from "react";
import { DocumentLink } from "@/components/document-link";
import { Pagination } from "@/components/pagination";
import { ScrollReveal } from "@/components/scroll-reveal";
import { banptRegulationApi, errorMessage, formatDate } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";

const PAGE_LIMIT = 10;

export function RegulasiBanpt() {
  const [searchQuery, setSearchQuery] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const searchId = useId();
  const yearId = useId();
  const debouncedSearch = useDebouncedValue(searchQuery.trim());

  const filterOptions = useApi("banpt-filter-options", banptRegulationApi.filterOptions);
  const years = filterOptions.data?.years ?? [];

  const { data, error, loading } = useApi(`banpt:${page}:${debouncedSearch}:${year}`, () =>
    banptRegulationApi.list({
      page,
      limit: PAGE_LIMIT,
      search: debouncedSearch || undefined,
      year: year ? Number(year) : undefined,
    }),
  );
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const firstEntry = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastEntry = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <section aria-labelledby="regulasi-banpt-title" className="akreditasi-section" id="regulasi-banpt">
      <div className="content-wrap">
        <ScrollReveal>
          <div className="akreditasi-section-header">
            <span className="akreditasi-eyebrow">REGULASI</span>
            <h2 className="akreditasi-section-title" id="regulasi-banpt-title">
              Peraturan BAN-PT
            </h2>
            <p className="akreditasi-section-desc">
              Peraturan Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT) yang menjadi acuan proses akreditasi.
            </p>
          </div>

          <div className="akreditasi-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor={yearId}>Tahun</label>
                <select
                  className="filter-select"
                  id={yearId}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(1);
                  }}
                  value={year}
                >
                  <option value="">Semua</option>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="sr-only" htmlFor={searchId}>
                  Cari peraturan
                </label>
                <input
                  className="filter-search"
                  id={searchId}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nomor atau judul peraturan ..."
                  type="text"
                  value={searchQuery}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="akreditasi-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Tahun</th>
                  <th>Tentang</th>
                  <th>Tanggal Penetapan</th>
                  <th>Dokumen</th>
                  <th>Lampiran</th>
                </tr>
              </thead>
              <tbody>
                {error && !data ? (
                  <tr>
                    <td colSpan={6} role="alert">
                      {errorMessage(error)}
                    </td>
                  </tr>
                ) : loading && !data ? (
                  <tr>
                    <td colSpan={6}>Memuat peraturan BAN-PT...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {debouncedSearch || year ? "Tidak ada peraturan yang sesuai." : "Peraturan BAN-PT belum tersedia."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.regulationNumber}</td>
                      <td>{item.regulationYear}</td>
                      <td>{item.title}</td>
                      <td>{item.determinationDate ? formatDate(item.determinationDate) : "-"}</td>
                      <td>
                        <DocumentLink file={item.document} />
                      </td>
                      <td>
                        {item.attachments.length === 0 ? (
                          "-"
                        ) : (
                          <ul className="regulasi-attachments">
                            {item.attachments.map((attachment) => (
                              <li key={attachment.id}>
                                <span>{attachment.name}</span>
                                <DocumentLink file={attachment} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <p className="table-info">
              Showing {firstEntry} to {lastEntry} of {pagination?.total ?? 0} entries
            </p>
            <Pagination label="Halaman peraturan BAN-PT" onChange={setPage} page={page} totalPages={pagination?.totalPages ?? 0} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
