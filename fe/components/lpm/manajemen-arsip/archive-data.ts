export type ArchiveCategory =
  | "Audit Mutu Internal"
  | "RTM & RTL"
  | "Laporan Tahunan"
  | "Penjaminan Mutu"
  | "Dokumen Pendukung";

export type ArchiveDocument = {
  id: number;
  title: string;
  category: ArchiveCategory;
  year: number;
  date: string;
  description: string;
  fileName: string;
  fileType: "PDF" | "DOCX" | "XLSX";
};

export const archiveCategories: ArchiveCategory[] = [
  "Audit Mutu Internal",
  "RTM & RTL",
  "Laporan Tahunan",
  "Penjaminan Mutu",
  "Dokumen Pendukung",
];

export const archiveDocuments: ArchiveDocument[] = [
  {
    id: 1,
    title: "Contoh Laporan Audit Mutu Internal",
    category: "Audit Mutu Internal",
    year: 2025,
    date: "2025-11-18",
    description: "Contoh ringkasan hasil pelaksanaan audit mutu internal.",
    fileName: "Contoh_Laporan_AMI_2025.pdf",
    fileType: "PDF",
  },
  {
    id: 2,
    title: "Contoh Rencana Tindak Lanjut Hasil Audit",
    category: "RTM & RTL",
    year: 2025,
    date: "2025-11-10",
    description: "Contoh pencatatan rencana tindak lanjut hasil evaluasi.",
    fileName: "Contoh_RTL_Audit_2025.docx",
    fileType: "DOCX",
  },
  {
    id: 3,
    title: "Contoh Notulen Rapat Tinjauan Manajemen",
    category: "RTM & RTL",
    year: 2025,
    date: "2025-10-22",
    description: "Contoh dokumentasi rapat tinjauan manajemen.",
    fileName: "Contoh_Notulen_RTM_2025.pdf",
    fileType: "PDF",
  },
  {
    id: 4,
    title: "Contoh Laporan Tahunan Penjaminan Mutu",
    category: "Laporan Tahunan",
    year: 2025,
    date: "2025-09-30",
    description: "Contoh rangkuman kegiatan penjaminan mutu tahunan.",
    fileName: "Contoh_Laporan_Tahunan_2025.pdf",
    fileType: "PDF",
  },
  {
    id: 5,
    title: "Contoh Pedoman Pelaksanaan Audit Mutu",
    category: "Penjaminan Mutu",
    year: 2025,
    date: "2025-08-14",
    description: "Contoh pedoman pelaksanaan audit di lingkungan perguruan tinggi.",
    fileName: "Contoh_Pedoman_Audit_2025.pdf",
    fileType: "PDF",
  },
  {
    id: 6,
    title: "Contoh Formulir Evaluasi Mutu Program Studi",
    category: "Dokumen Pendukung",
    year: 2024,
    date: "2024-12-03",
    description: "Contoh formulir pendukung evaluasi mutu program studi.",
    fileName: "Contoh_Formulir_Evaluasi_2024.xlsx",
    fileType: "XLSX",
  },
  {
    id: 7,
    title: "Contoh Laporan Audit Mutu Internal Tahunan",
    category: "Audit Mutu Internal",
    year: 2024,
    date: "2024-11-20",
    description: "Contoh laporan pelaksanaan audit mutu internal tahunan.",
    fileName: "Contoh_Laporan_AMI_2024.pdf",
    fileType: "PDF",
  },
  {
    id: 8,
    title: "Contoh Rencana Tindak Lanjut RTM",
    category: "RTM & RTL",
    year: 2024,
    date: "2024-10-17",
    description: "Contoh daftar tindak lanjut hasil rapat tinjauan manajemen.",
    fileName: "Contoh_RTL_RTM_2024.docx",
    fileType: "DOCX",
  },
  {
    id: 9,
    title: "Contoh Laporan Tahunan Evaluasi Mutu",
    category: "Laporan Tahunan",
    year: 2024,
    date: "2024-08-29",
    description: "Contoh dokumentasi evaluasi dan peningkatan mutu tahunan.",
    fileName: "Contoh_Evaluasi_Mutu_2024.pdf",
    fileType: "PDF",
  },
  {
    id: 10,
    title: "Contoh Standar Operasional Penjaminan Mutu",
    category: "Penjaminan Mutu",
    year: 2023,
    date: "2023-12-12",
    description: "Contoh dokumen prosedur penjaminan mutu internal.",
    fileName: "Contoh_SOP_Mutu_2023.pdf",
    fileType: "PDF",
  },
  {
    id: 11,
    title: "Contoh Daftar Periksa Audit Internal",
    category: "Dokumen Pendukung",
    year: 2023,
    date: "2023-09-06",
    description: "Contoh daftar periksa untuk mendukung proses audit internal.",
    fileName: "Contoh_Checklist_Audit_2023.xlsx",
    fileType: "XLSX",
  },
  {
    id: 12,
    title: "Contoh Notulen Rapat Evaluasi Mutu",
    category: "RTM & RTL",
    year: 2022,
    date: "2022-07-21",
    description: "Contoh catatan rapat evaluasi dan peningkatan mutu.",
    fileName: "Contoh_Notulen_Evaluasi_2022.docx",
    fileType: "DOCX",
  },
];
