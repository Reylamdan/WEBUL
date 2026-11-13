"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { accreditationApi, errorMessage, type ExpiryStatus } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";

const EXPIRY_LABEL: Record<ExpiryStatus, string> = {
  active: "Terakreditasi",
  expiring: "Segera Berakhir",
  expired: "Kedaluwarsa",
  unknown: "Tidak Diketahui",
};

// Perguruan tinggi penyelenggara; backend hanya menyimpan data program studi Universitas LIA.
const INSTITUTION_NAME = "Universitas LIA Indonesia";

// Backend membatasi maksimal 50 data per halaman.
const MAX_PAGE_SIZE = 50;

function pageWindow(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function AkreditasiTable() {
  const [show, setShow] = useState(10);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [jenjangFilter, setJenjangFilter] = useState("Semua");
  const [kadaluarsaFilter, setKadaluarsaFilter] = useState("Semua");
  const debouncedSearch = useDebouncedValue(searchQuery.trim());

  const limit = Math.min(show, MAX_PAGE_SIZE);
  const level = jenjangFilter === "Semua" ? undefined : jenjangFilter;
  const validUntilFrom = kadaluarsaFilter === "Semua" ? undefined : `${kadaluarsaFilter}-01-01`;
  const validUntilTo = kadaluarsaFilter === "Semua" ? undefined : `${kadaluarsaFilter}-12-31`;

  const { data, error, loading } = useApi(
    ["akreditasi", page, limit, debouncedSearch, level, validUntilFrom].join("|"),
    () =>
      accreditationApi.studyPrograms({
        page,
        limit,
        search: debouncedSearch || undefined,
        level,
        validUntilFrom,
        validUntilTo,
      }),
  );

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  // Filter "Terakreditasi": hanya akreditasi yang belum kedaluwarsa (backend belum mendukung
  // filter gabungan active+expiring, jadi diterapkan pada halaman yang sedang dimuat).
  const displayedData = (data?.items ?? []).filter(
    (item) => statusFilter === "Semua" || (item.expiryStatus !== "expired" && item.expiryStatus !== "unknown"),
  );
  const firstEntry = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastEntry = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  const resetPage = () => setPage(1);

  return (
    <section className="akreditasi-section">
      <div className="content-wrap">
        <ScrollReveal>
          <div className="akreditasi-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="show-entries">Show</label>
                <select
                  id="show-entries"
                  value={show}
                  onChange={(e) => {
                    setShow(Number(e.target.value));
                    resetPage();
                  }}
                  className="filter-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="filter-group">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="Semua">Semua</option>
                  <option value="Terakreditasi">Terakreditasi</option>
                </select>

                <select
                  value={jenjangFilter}
                  onChange={(e) => {
                    setJenjangFilter(e.target.value);
                    resetPage();
                  }}
                  className="filter-select"
                >
                  <option value="Semua">Semua</option>
                  <option value="S1">S1</option>
                  <option value="D3">D3</option>
                  <option value="S2">S2</option>
                </select>

                <select
                  value={kadaluarsaFilter}
                  onChange={(e) => {
                    setKadaluarsaFilter(e.target.value);
                    resetPage();
                  }}
                  className="filter-select"
                >
                  <option value="Semua">Semua</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>

                <input
                  type="text"
                  placeholder="Search ..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    resetPage();
                  }}
                  className="filter-search"
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="akreditasi-table">
              <thead>
                <tr>
                  <th>Perguruan Tinggi</th>
                  <th>Program Studi</th>
                  <th>Strata</th>
                  <th>Jenjang</th>
                  <th>No. SK</th>
                  <th>Tahun SK</th>
                  <th>Peringkat</th>
                  <th>Tanggal Kadaluarsa</th>
                  <th>Status Kadaluarsa</th>
                </tr>
              </thead>
              <tbody>
                {error && !data ? (
                  <tr>
                    <td colSpan={9} role="alert">
                      {errorMessage(error)}
                    </td>
                  </tr>
                ) : loading && !data ? (
                  <tr>
                    <td colSpan={9}>Memuat data akreditasi...</td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={9}>Tidak ada data akreditasi yang sesuai.</td>
                  </tr>
                ) : (
                  displayedData.map((item) => (
                    <tr key={item.id}>
                      <td>{INSTITUTION_NAME}</td>
                      <td>{item.programName}</td>
                      <td>{item.educationLevel}</td>
                      <td>{item.educationLevel}</td>
                      <td>{item.skNumber}</td>
                      <td>{item.decisionDate ? item.decisionDate.slice(0, 4) : "-"}</td>
                      <td>{item.rank}</td>
                      <td>{item.validUntil ?? "-"}</td>
                      <td>
                        <span className="status-badge status-terakreditasi">
                          {EXPIRY_LABEL[item.expiryStatus]}
                        </span>
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
            {totalPages > 1 && (
              <div className="pagination">
                {pageWindow(page, totalPages).map((number) => (
                  <button
                    className={`pagination-btn${number === page ? " active" : ""}`}
                    key={number}
                    onClick={() => setPage(number)}
                    type="button"
                  >
                    {number}
                  </button>
                ))}
                {page < totalPages && (
                  <button className="pagination-btn" onClick={() => setPage(page + 1)} type="button">
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
