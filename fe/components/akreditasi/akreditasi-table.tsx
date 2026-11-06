"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

type AkreditasiData = {
  id: number;
  programStudi: string;
  programStudiEng: string;
  strata: string;
  jenjang: string;
  nomorSK: string;
  tanggalSK: string;
  peringkat: string;
  tanggalKadaluarsa: string;
  status: string;
};

const akreditasiData: AkreditasiData[] = [
  {
    id: 1,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "Universitas LIA Indonesia",
    strata: "Institut",
    jenjang: "UNIV.",
    nomorSK: "Sesuai Lampiran Sertifikat No.0096/SK/BAN-PT/AK-ISK/Inst/I/2025",
    tanggalSK: "2025",
    peringkat: "Terakreditasi Institusi",
    tanggalKadaluarsa: "2025-01-07",
    status: "Terakreditasi"
  },
  {
    id: 2,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "PENDIDIKAN BAHASA INGGRIS",
    strata: "Sarjana",
    jenjang: "S1",
    nomorSK: "0055/LAM-PTBAJK/Ak/S/XII/2022",
    tanggalSK: "2025",
    peringkat: "Terakreditasi Baik/Baik",
    tanggalKadaluarsa: "2025-12-20",
    status: "Terakreditasi"
  },
  {
    id: 3,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "FARMASI",
    strata: "S 3",
    jenjang: "S-TBL",
    nomorSK: "0025-LAM-PTKES/AK-PTA/PT/XII/2023",
    tanggalSK: "2027",
    peringkat: "Baik",
    tanggalKadaluarsa: "2027-12-12",
    status: "Terakreditasi"
  },
  {
    id: 4,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "PARIWISATA",
    strata: "D-III",
    jenjang: "D-TBL",
    nomorSK: "0024-LAM-PTKES/AK-PTA/PT/XII/2023",
    tanggalSK: "2027",
    peringkat: "Baik",
    tanggalKadaluarsa: "2027-12-12",
    status: "Terakreditasi"
  },
  {
    id: 5,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "SASTRA JEPANG (SASTRA LAUT ALIRAN ASIA)",
    strata: "S1",
    jenjang: "S-TBL",
    nomorSK: "0025-LAM-PTKES/AK-PTA/PT/XII/2023",
    tanggalSK: "2027",
    peringkat: "Baik",
    tanggalKadaluarsa: "2027-12-12",
    status: "Terakreditasi"
  },
  {
    id: 6,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "SASTRA INGGRIS (BAHASA, BAHASA & SASTRA ASING - SASIANG BAHASA ASING)",
    strata: "D-III",
    jenjang: "D-TBL",
    nomorSK: "0026-LAM-PTKES/AK-PTA/PT/XII/2023",
    tanggalSK: "2027",
    peringkat: "Baik Sekali",
    tanggalKadaluarsa: "2027-12-12",
    status: "Terakreditasi"
  },
  {
    id: 7,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "BISNIS DIGITAL",
    strata: "S1",
    jenjang: "PTN",
    nomorSK: "GJAL-BS-LAM-PT/AK-S/PT/AL-V/XI/2025",
    tanggalSK: "2025",
    peringkat: "Baik Sekali",
    tanggalKadaluarsa: "2025-05-09",
    status: "Terakreditasi"
  },
  {
    id: 8,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "INFORMATIKA",
    strata: "S1",
    jenjang: "Sts",
    nomorSK: "GJAL-BS-LAM-KOMP/AK-PT/AL-V/XI/2025",
    tanggalSK: "2025",
    peringkat: "Baik",
    tanggalKadaluarsa: "2025-05-09",
    status: "Terakreditasi"
  },
  {
    id: 9,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "SISTEM INFORMASI",
    strata: "S1",
    jenjang: "Sts",
    nomorSK: "GJAL-BS-LAM-PT/AK-PT/AL-V/XI/2025",
    tanggalSK: "2025",
    peringkat: "Baik",
    tanggalKadaluarsa: "2025-05-09",
    status: "Terakreditasi"
  },
  {
    id: 10,
    programStudi: "Universitas LIA Indonesia",
    programStudiEng: "DESAIN KOMUNIKASI VISUAL",
    strata: "S1",
    jenjang: "Sts",
    nomorSK: "GJAL-DKV-LAM-PT/AK-PT/AL-V/XI/2025",
    tanggalSK: "2026",
    peringkat: "Baik",
    tanggalKadaluarsa: "2026-02-02",
    status: "Terakreditasi"
  }
];

export function AkreditasiTable() {
  const [show, setShow] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [jenjangFilter, setJenjangFilter] = useState("Semua");
  const [kadaluarsaFilter, setKadaluarsaFilter] = useState("Semua");

  const filteredData = akreditasiData.filter(item => {
    const matchesSearch = item.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.programStudiEng.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "Semua" || item.status === statusFilter;
    const matchesJenjang = jenjangFilter === "Semua" || item.jenjang === jenjangFilter;
    const matchesKadaluarsa = kadaluarsaFilter === "Semua" || item.tanggalKadaluarsa.includes(kadaluarsaFilter);
    
    return matchesSearch && matchesStatus && matchesJenjang && matchesKadaluarsa;
  });

  const displayedData = filteredData.slice(0, show);
  const remainingCount = filteredData.length - show;

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
                  onChange={(e) => setShow(Number(e.target.value))}
                  className="filter-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
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
                  onChange={(e) => setJenjangFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="Semua">Semua</option>
                  <option value="S1">S1</option>
                  <option value="D3">D3</option>
                  <option value="S2">S2</option>
                </select>

                <select
                  value={kadaluarsaFilter}
                  onChange={(e) => setKadaluarsaFilter(e.target.value)}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {displayedData.map((item) => (
                  <tr key={item.id}>
                    <td>{item.programStudi}</td>
                    <td>{item.programStudiEng}</td>
                    <td>{item.strata}</td>
                    <td>{item.jenjang}</td>
                    <td>{item.nomorSK}</td>
                    <td>{item.tanggalSK}</td>
                    <td>{item.peringkat}</td>
                    <td>{item.tanggalKadaluarsa}</td>
                    <td>
                      <span className="status-badge status-terakreditasi">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <p className="table-info">
              Showing 1 to {displayedData.length} of {filteredData.length} entries
            </p>
            {remainingCount > 0 && (
              <div className="pagination">
                <button className="pagination-btn active">1</button>
                <button className="pagination-btn">2</button>
                <button className="pagination-btn">3</button>
                <button className="pagination-btn">4</button>
                <button className="pagination-btn">5</button>
                <button className="pagination-btn">...</button>
                <button className="pagination-btn">Next</button>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
