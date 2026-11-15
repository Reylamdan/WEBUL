"use client";

import { useState } from "react";
import { DocumentLink } from "@/components/document-link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { accreditationApi, errorMessage, todayIso, type ExpiryStatus } from "@/lib/api";
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
  // Tanggal hari ini (YYYY-MM-DD, zona Jakarta) hanya dibaca saat pengguna memilih "Terakreditasi" (event handler),
  // bukan saat render: new Date() saat render dianggap Next.js sebagai nilai tidak stabil pada prerender.
  const [accreditedSince, setAccreditedSince] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery.trim());

  const limit = Math.min(show, MAX_PAGE_SIZE);
  const level = jenjangFilter === "Semua" ? undefined : jenjangFilter;
  const yearFrom = kadaluarsaFilter === "Semua" ? undefined : `${kadaluarsaFilter}-01-01`;
  const validUntilTo = kadaluarsaFilter === "Semua" ? undefined : `${kadaluarsaFilter}-12-31`;

  // "Terakreditasi" = akreditasi yang masih berlaku (kedaluwarsa hari ini atau setelahnya, mencakup status
  // "aktif" dan "segera berakhir"; yang kedaluwarsa dan yang tanpa tanggal tidak termasuk). Disaring di server
  // lewat validUntilFrom=hari ini, digabung dengan filter tahun kedaluwarsa, sehingga total dan pagination akurat.
  const today = accreditedSince;
  const onlyAccredited = statusFilter === "Terakreditasi" && today !== null;
  const validUntilFrom = today !== null && onlyAccredited && (!yearFrom || yearFrom < today) ? today : yearFrom;
  // Rentang yang saling bertentangan (mis. tahun kedaluwarsa sudah lewat + Terakreditasi) pasti kosong.
  const impossibleRange = Boolean(validUntilFrom && validUntilTo && validUntilTo < validUntilFrom);

  const { data, error, loading } = useApi(
    ["akreditasi", page, limit, debouncedSearch, level, validUntilFrom, validUntilTo, impossibleRange].join("|"),
    () =>
      impossibleRange
        ? Promise.resolve({ items: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } })
        : accreditationApi.studyPrograms({
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
  const displayedData = data?.items ?? [];
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setStatusFilter(value);
                    setAccreditedSince(value === "Terakreditasi" ? todayIso() : null);
                    resetPage();
                  }}
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
                  <th>Dokumen SK</th>
                </tr>
              </thead>
              <tbody>
                {error && !data ? (
                  <tr>
                    <td colSpan={10} role="alert">
                      {errorMessage(error)}
                    </td>
                  </tr>
                ) : loading && !data ? (
                  <tr>
                    <td colSpan={10}>Memuat data akreditasi...</td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={10}>Tidak ada data akreditasi yang sesuai.</td>
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
                      <td>
                        <DocumentLink file={item.document} />
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