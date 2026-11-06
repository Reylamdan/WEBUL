"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Icon } from "@/components/icons";

type DokumenData = {
  id: number;
  judul: string;
  deskripsi: string;
  tglUpload: string;
  files: {
    name: string;
    type: "pdf" | "doc" | "xls" | "zip";
  }[];
};

const dokumenData: DokumenData[] = [
  {
    id: 1,
    judul: "Dokumen kepegawaian seluruh pegawai termasuk pegawai tidak tetap",
    deskripsi: "Berkas dokumen kepegawaian",
    tglUpload: "29 Agustus 2023",
    files: [
      { name: "Daftar Pegawai", type: "pdf" },
      { name: "KTP", type: "pdf" }
    ]
  },
  {
    id: 2,
    judul: "Dokumen pengadaan barang mebeler dan partisi Jagowebdev",
    deskripsi: "Berkas dokumen pengadaan barang",
    tglUpload: "29 Agustus 2023",
    files: [
      { name: "Rincian Biaya Pengadaan Barang", type: "pdf" },
      { name: "Dokumen Pengadaan Barang", type: "pdf" }
    ]
  },
  {
    id: 3,
    judul: "Dokumen lelang gedung lantai 4",
    deskripsi: "Dokumen lelang gedung lantai 4",
    tglUpload: "31 Agustus 2023",
    files: [
      { name: "Dokumen Lelang", type: "zip" }
    ]
  },
  {
    id: 4,
    judul: "Dokumen lelang kendaraan roda empat",
    deskripsi: "Dokumen lelang kendaraan roda empat",
    tglUpload: "30 Agustus 2023",
    files: [
      { name: "Dokumen Lelang Roda Empat", type: "xls" }
    ]
  },
  {
    id: 5,
    judul: "Pembangunan gedung dua lantai",
    deskripsi: "Pembangunan gedung dua lantai",
    tglUpload: "31 Agustus 2023",
    files: [
      { name: "Rincian Biaya Pembangunan", type: "doc" }
    ]
  },
  {
    id: 6,
    judul: "Permohonan ijin menjalankan usaha",
    deskripsi: "Permohonan ijin menjalankan usaha",
    tglUpload: "30 Agustus 2023",
    files: [
      { name: "Permohonan Ijin Usaha", type: "doc" }
    ]
  },
  {
    id: 7,
    judul: "Permohonan kartu pegawai",
    deskripsi: "Permohonan kartu pegawai",
    tglUpload: "30 Agustus 2023",
    files: [
      { name: "Kartu Pegawai", type: "doc" }
    ]
  }
];

export function ManajemenArsipTable() {
  const [show, setShow] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("Semua Kategori");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filteredData = dokumenData.filter(item => {
    const matchesSearch = item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const displayedData = filteredData.slice(0, show);

  const getFileIcon = (type: string) => {
    switch(type) {
      case "pdf": return "📄";
      case "doc": return "📝";
      case "xls": return "📊";
      case "zip": return "📦";
      default: return "📄";
    }
  };

  return (
    <section className="manajemen-arsip-section">
      <div className="content-wrap">
        <ScrollReveal>
          <div className="arsip-header">
            <h2>Dokumen</h2>
            <div className="arsip-actions">
              <button className="btn-tambah" onClick={() => setShowUploadModal(true)}>
                + Tambah Data
              </button>
              <button className="btn-hapus" onClick={() => setShowDeleteModal(true)}>
                🗑 Hapus Semua Data
              </button>
            </div>
          </div>

          <div className="arsip-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Kategori</label>
                <select
                  value={kategoriFilter}
                  onChange={(e) => setKategoriFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="Semua Kategori">Semua Kategori</option>
                  <option value="Kepegawaian">Kepegawaian</option>
                  <option value="Pengadaan">Pengadaan</option>
                  <option value="Lelang">Lelang</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Show</label>
                <select
                  value={show}
                  onChange={(e) => setShow(Number(e.target.value))}
                  className="filter-select-small"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="filter-search-group">
                <label>Search:</label>
                <input
                  type="text"
                  placeholder=""
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-search-small"
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="arsip-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>No</th>
                  <th>Judul</th>
                  <th>Deskripsi</th>
                  <th style={{ width: "150px" }}>Tgl. Upload</th>
                  <th style={{ width: "200px" }}>File</th>
                  <th style={{ width: "150px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>{item.judul}</td>
                    <td>{item.deskripsi}</td>
                    <td>{item.tglUpload}</td>
                    <td>
                      <div className="file-list">
                        {item.files.map((file, idx) => (
                          <div key={idx} className="file-item">
                            <span className="file-icon">{getFileIcon(file.type)}</span>
                            <span className="file-name">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit">
                          ✏️ Edit
                        </button>
                        <button className="btn-delete">
                          ✖ Delete
                        </button>
                      </div>
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
            <div className="pagination">
              <button className="pagination-btn">Previous</button>
              <button className="pagination-btn active">1</button>
              <button className="pagination-btn">Next</button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
