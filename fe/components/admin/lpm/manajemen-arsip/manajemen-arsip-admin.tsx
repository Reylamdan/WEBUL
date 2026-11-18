"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { errorMessage, resolveApiUrl } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  ARCHIVE_CATEGORIES,
  lpmArchiveAdminApi,
  type AdminArchiveItem,
  type ArchiveCategory,
  type PublishStatus,
} from "@/lib/lpm-archive-admin-api";

const PAGE_SIZE = 10;

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getCategoryColor(cat: ArchiveCategory): { bg: string; text: string; border: string } {
  switch (cat) {
    case "Audit Mutu Internal":
      return { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" };
    case "RTM & RTL":
      return { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" };
    case "Laporan Tahunan":
      return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
    case "Penjaminan Mutu":
      return { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" };
    case "Dokumen Pendukung":
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
  }
}

function getFileTypeBadge(type: "PDF" | "DOCX" | "XLSX" | null) {
  if (!type) return null;
  const config = {
    PDF: { bg: "#fee2e2", text: "#b91c1c" },
    DOCX: { bg: "#dbeafe", text: "#1d4ed8" },
    XLSX: { bg: "#dcfce7", text: "#15803d" },
  }[type] || { bg: "#f1f5f9", text: "#475569" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 700,
        backgroundColor: config.bg,
        color: config.text,
        letterSpacing: "0.02em",
      }}
    >
      {type}
    </span>
  );
}

// ================= Modal Tambah / Edit Arsip =================
function ArchiveModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminArchiveItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<ArchiveCategory>(item?.category ?? "Audit Mutu Internal");
  const [year, setYear] = useState<number>(item?.year ?? currentYear);
  const [date, setDate] = useState<string>(item?.date ?? todayStr);
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const hasExistingFile = Boolean(item?.file);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul arsip wajib diisi.");
      return;
    }
    if (!category) {
      setError("Kategori arsip wajib dipilih.");
      return;
    }
    if (!year || year < 1900 || year > 2100) {
      setError("Tahun dokumen tidak valid (1900 - 2100).");
      return;
    }
    if (!date) {
      setError("Tanggal dokumen wajib diisi.");
      return;
    }

    if (status === "published" && !hasExistingFile && !file) {
      setError("Dokumen berkas (PDF, DOCX, atau XLSX) wajib diunggah sebelum arsip dapat dipublikasikan.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (item) {
        // Mode Edit
        setSaveStep("Memperbarui data arsip...");
        await lpmArchiveAdminApi.update(item.id, {
          title: title.trim(),
          category,
          year: Number(year),
          date,
          description: description.trim(),
          status,
        });

        if (file) {
          setSaveStep("Mengunggah dokumen baru ke Google Drive...");
          await lpmArchiveAdminApi.uploadDocument(item.id, file);
        }

        onSaved("Data arsip berhasil diperbarui.");
      } else {
        // Mode Tambah
        setSaveStep("Menyimpan draft arsip...");
        const created = await lpmArchiveAdminApi.create({
          title: title.trim(),
          category,
          year: Number(year),
          date,
          description: description.trim(),
          status: "draft",
        });

        if (file) {
          setSaveStep("Mengunggah dokumen berkas ke Google Drive...");
          await lpmArchiveAdminApi.uploadDocument(created.id, file);

          if (status === "published") {
            setSaveStep("Mempublikasikan arsip...");
            await lpmArchiveAdminApi.update(created.id, { status: "published" });
          }
        }

        onSaved(
          file
            ? status === "published"
              ? "Arsip baru berhasil ditambahkan dan dipublikasikan."
              : "Arsip baru beserta dokumen berhasil disimpan sebagai draf."
            : "Draft arsip baru berhasil disimpan. Silakan unggah dokumen berkas agar dapat dipublikasikan."
        );
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setSaveStep("");
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 640 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">{item ? "Edit Dokumen Arsip LPM" : "Tambah Arsip Baru LPM"}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          <div className="aa-field">
            <span>
              Judul Arsip <strong style={{ color: "#b3261e" }}>*</strong>
            </span>
            <input
              id={`${uid}-title`}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Laporan Audit Mutu Internal (AMI) Siklus XIV Tahun 2026"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <span>
                Kategori Arsip <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <select
                id={`${uid}-category`}
                onChange={(e) => setCategory(e.target.value as ArchiveCategory)}
                value={category}
              >
                {ARCHIVE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="aa-field" style={{ maxWidth: 140 }}>
              <span>
                Tahun <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input
                id={`${uid}-year`}
                max={2100}
                min={1900}
                onChange={(e) => setYear(Number(e.target.value))}
                required
                type="number"
                value={year}
              />
            </div>

            <div className="aa-field" style={{ maxWidth: 170 }}>
              <span>
                Tanggal Dokumen <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input
                id={`${uid}-date`}
                onChange={(e) => setDate(e.target.value)}
                required
                type="date"
                value={date}
              />
            </div>
          </div>

          <div className="aa-field">
            <span>Deskripsi / Keterangan Dokumen (Opsional)</span>
            <textarea
              id={`${uid}-desc`}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ringkasan isi, tujuan audit, atau catatan penting terkait dokumen ini..."
              rows={3}
              value={description}
            />
          </div>

          {/* Dokumen File Upload Box */}
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "#f8fafc",
              border: "1px dashed var(--admin-line, #cbd5e1)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-ink)" }}>
              Berkas Dokumen (PDF, DOCX, XLSX — Maks. 20 MB)
            </span>

            {item && item.fileName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid var(--admin-border, #e2e8f0)",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {getFileTypeBadge(item.fileType)}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--admin-ink-dark)",
                    }}
                    title={item.fileName}
                  >
                    {item.fileName}
                  </span>
                  <span style={{ color: "var(--admin-muted)", fontSize: "11px", flexShrink: 0 }}>
                    ({formatFileSize(item.fileSize)})
                  </span>
                </div>
                {item.file && (
                  <a
                    className="aa-btn aa-btn-sm"
                    href={resolveApiUrl(item.file.downloadUrl) || "#"}
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", fontSize: "11.5px", padding: "3px 8px" }}
                    target="_blank"
                  >
                    Unduh
                  </a>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor={`${uid}-file`}
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--admin-muted)",
                  marginBottom: 4,
                }}
              >
                {item?.fileName ? "Unggah file baru untuk menggantikan dokumen lama:" : "Pilih file dokumen:"}
              </label>
              <input
                accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                id={`${uid}-file`}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                type="file"
              />
              {file && (
                <div style={{ marginTop: 4, fontSize: "12px", color: "#166534" }}>
                  File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
                </div>
              )}
            </div>
          </div>

          <div className="aa-field">
            <span>
              Status Publikasi <strong style={{ color: "#b3261e" }}>*</strong>
            </span>
            <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13.5px", cursor: "pointer" }}>
                <input
                  checked={status === "draft"}
                  name="status"
                  onChange={() => setStatus("draft")}
                  type="radio"
                  value="draft"
                />
                <span>Draft (Hanya dapat dilihat admin)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13.5px", cursor: "pointer" }}>
                <input
                  checked={status === "published"}
                  name="status"
                  onChange={() => setStatus("published")}
                  type="radio"
                  value="published"
                />
                <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (Tampil di website publik)</span>
              </label>
            </div>
            {!hasExistingFile && !file && status === "published" && (
              <small style={{ color: "#b45309", fontSize: "12px", marginTop: 4 }}>
                ⚠️ Berkas dokumen wajib dilampirkan jika memilih status Dipublikasikan.
              </small>
            )}
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 12 }}>
            <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? (saveStep || "Menyimpan...") : item ? "Simpan Perubahan" : "Buat Arsip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Upload Dokumen Khusus =================
function UploadDocumentModal({
  item,
  onClose,
  onUploaded,
}: {
  item: AdminArchiveItem;
  onClose: () => void;
  onUploaded: (msg: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [publishAfterUpload, setPublishAfterUpload] = useState(item.status === "draft");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih berkas dokumen terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await lpmArchiveAdminApi.uploadDocument(item.id, file);

      if (publishAfterUpload && item.status === "draft") {
        await lpmArchiveAdminApi.update(item.id, { status: "published" });
        onUploaded(`Dokumen untuk "${item.title}" berhasil diunggah dan status diubah menjadi Dipublikasikan.`);
      } else {
        onUploaded(`Dokumen untuk "${item.title}" berhasil diunggah.`);
      }

      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 520 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">
            {item.fileName ? "Ganti Berkas Dokumen" : "Unggah Berkas Dokumen"}
          </h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--admin-ink)" }}>{item.title}</div>
            <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: 2 }}>
              Kategori: {item.category} • Tahun: {item.year}
            </div>
          </div>

          {item.fileName && (
            <div
              style={{
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid var(--admin-border, #e2e8f0)",
                borderRadius: "6px",
                fontSize: "12.5px",
              }}
            >
              <div style={{ color: "var(--admin-muted)", fontSize: "11px", marginBottom: 2 }}>Berkas Saat Ini:</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {getFileTypeBadge(item.fileType)}
                <strong>{item.fileName}</strong>
                <span style={{ color: "var(--admin-muted)" }}>({formatFileSize(item.fileSize)})</span>
              </div>
            </div>
          )}

          <div className="aa-field">
            <span>Pilih Berkas Dokumen Baru (PDF, DOCX, XLSX — Maks. 20 MB)</span>
            <input
              accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              type="file"
            />
            {file && (
              <div style={{ marginTop: 4, fontSize: "12px", color: "#166534" }}>
                File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </div>
            )}
          </div>

          {item.status === "draft" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", cursor: "pointer" }}>
              <input
                checked={publishAfterUpload}
                onChange={(e) => setPublishAfterUpload(e.target.checked)}
                type="checkbox"
              />
              <span>Langsung terbitkan arsip ini setelah dokumen berhasil diunggah</span>
            </label>
          )}

          <div className="aa-modal-actions" style={{ marginTop: 10 }}>
            <button className="aa-btn" disabled={uploading} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={uploading} type="submit">
              {uploading ? "Mengunggah Dokumen..." : "Unggah Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Konfirmasi Hapus =================
function DeleteConfirmModal({
  item,
  onClose,
  onDeleted,
}: {
  item: AdminArchiveItem;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await lpmArchiveAdminApi.remove(item.id);
      onDeleted(`Arsip "${item.title}" berhasil dihapus beserta berkas dokumen terkait.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 460 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          Hapus Arsip LPM?
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 8px", fontSize: "14px", lineHeight: 1.5 }}>
          Anda yakin ingin menghapus arsip:
          <br />
          <strong>&ldquo;{item.title}&rdquo;</strong>?
        </p>
        {item.fileName && (
          <div
            style={{
              padding: "8px 12px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#9f1239",
            }}
          >
            ⚠️ Berkas <strong>{item.fileName}</strong> yang tersimpan di Google Drive juga akan dihapus secara permanen.
          </div>
        )}
        <div className="aa-modal-actions" style={{ marginTop: 14 }}>
          <button className="aa-btn" disabled={deleting} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-danger" disabled={deleting} onClick={handleDelete} type="button">
            {deleting ? "Menghapus..." : "Ya, Hapus Arsip"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Komponen Utama Halaman Admin Manajemen Arsip =================
export function ManajemenArsipAdmin() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdminArchiveItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminArchiveItem | null>(null);
  const [uploadingItem, setUploadingItem] = useState<AdminArchiveItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminArchiveItem | null>(null);

  // Ambil opsi filter dari server
  useEffect(() => {
    lpmArchiveAdminApi
      .filterOptions()
      .then((res) => {
        if (res.years && res.years.length > 0) {
          setAvailableYears(res.years);
        }
      })
      .catch(() => {
        // Abaikan jika filterOptions gagal, UI tetap berfungsi
      });
  }, [reloadToken]);

  // Muat data arsip
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    lpmArchiveAdminApi
      .list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        category: selectedCategory || undefined,
        year: selectedYear ? Number(selectedYear) : undefined,
        status: (selectedStatus as PublishStatus) || undefined,
      })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages || 1);
      })
      .catch((err) => {
        if (!active) return;
        setError(errorMessage(err));
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, selectedCategory, selectedYear, selectedStatus, page, reloadToken]);

  // Reset page saat filter berubah
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCategory(e.target.value);
    setPage(1);
  }

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedYear(e.target.value);
    setPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedStatus(e.target.value);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSelectedCategory("");
    setSelectedYear("");
    setSelectedStatus("");
    setPage(1);
  }

  function handleSaved(msg: string) {
    setNotice(msg);
    setReloadToken((k) => k + 1);
  }

  // Quick Toggle Status Publish / Draft
  async function toggleStatus(item: AdminArchiveItem) {
    if (item.status === "draft" && !item.file) {
      setNotice(
        `Arsip "${item.title}" belum memiliki berkas dokumen. Unggah dokumen terlebih dahulu sebelum menerbitkan.`
      );
      setUploadingItem(item);
      return;
    }

    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await lpmArchiveAdminApi.update(item.id, { status: nextStatus });
      setNotice(
        nextStatus === "published"
          ? `Arsip "${item.title}" telah dipublikasikan.`
          : `Arsip "${item.title}" diubah kembali ke status Draf.`
      );
      setReloadToken((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Ringkasan Cepat
  const stats = useMemo(() => {
    const publishedCount = items.filter((i) => i.status === "published").length;
    const draftCount = items.filter((i) => i.status === "draft").length;
    const withDocCount = items.filter((i) => Boolean(i.file)).length;
    return { publishedCount, draftCount, withDocCount };
  }, [items]);

  const hasActiveFilters = Boolean(search || selectedCategory || selectedYear || selectedStatus);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="aa-page">
      {/* Header Utama */}
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Manajemen Arsip LPM</h1>
          <p className="aa-subtitle">
            Kelola dokumen penjaminan mutu, laporan Audit Mutu Internal (AMI), RTM & RTL, serta dokumen pendukung LPM lainnya.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            className="aa-btn"
            href="/lpm/manajemen-arsip"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            target="_blank"
            title="Lihat Halaman Direktori Publik"
          >
            <span>Halaman Publik</span>
            <AdminIcon name="external" size={14} />
          </Link>

          <button
            className="aa-btn aa-btn-primary"
            onClick={() => setCreateModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            type="button"
          >
            <span style={{ fontSize: "16px", fontWeight: 700 }}>+</span>
            <span>Tambah Arsip Baru</span>
          </button>
        </div>
      </header>

      {/* Kartu Ringkasan Cepat */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "1px solid var(--admin-border, #e2e8ed)",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--admin-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Total Arsip Terdata
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--admin-ink-dark)", marginTop: 4 }}>
            {total}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "1px solid var(--admin-border, #e2e8ed)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>
            Dipublikasikan (Halaman ini)
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#15803d", marginTop: 4 }}>
            {stats.publishedCount} <span style={{ fontSize: "14px", color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "1px solid var(--admin-border, #e2e8ed)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
            Draf (Halaman ini)
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#475569", marginTop: 4 }}>
            {stats.draftCount} <span style={{ fontSize: "14px", color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "1px solid var(--admin-border, #e2e8ed)",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--admin-blue)", fontWeight: 600, textTransform: "uppercase" }}>
            Memiliki Berkas File
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--admin-blue)", marginTop: 4 }}>
            {stats.withDocCount} <span style={{ fontSize: "14px", color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
          </div>
        </div>
      </section>

      {/* Notifikasi & Error */}
      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: "12px", marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}

      {error && <p className="aa-error">{error}</p>}

      {/* Filter & Pencarian Bar */}
      <section
        style={{
          background: "#ffffff",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid var(--admin-border, #e2e8ed)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px 140px 150px auto",
            gap: 10,
          }}
        >
          {/* Input Cari */}
          <div>
            <input
              onChange={handleSearchChange}
              placeholder="Cari judul arsip, deskripsi, nama file, atau tahun..."
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
              type="text"
              value={search}
            />
          </div>

          {/* Kategori Dropdown */}
          <div>
            <select
              onChange={handleCategoryChange}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
              value={selectedCategory}
            >
              <option value="">Semua Kategori</option>
              {ARCHIVE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Dropdown */}
          <div>
            <select
              onChange={handleYearChange}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
              value={selectedYear}
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              onChange={handleStatusChange}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
              value={selectedStatus}
            >
              <option value="">Semua Status</option>
              <option value="published">Dipublikasikan</option>
              <option value="draft">Draf</option>
            </select>
          </div>

          {/* Tombol Reset Filter */}
          <div>
            <button
              className="aa-btn"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              style={{ whiteSpace: "nowrap" }}
              type="button"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "var(--admin-muted)" }}>
          <span>
            Menampilkan data ke-<strong>{firstItem}</strong> sampai <strong>{lastItem}</strong> dari total <strong>{total}</strong> dokumen arsip
          </span>
          {hasActiveFilters && <span>(Filter aktif)</span>}
        </div>
      </section>

      {/* Tabel Data Arsip */}
      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: "center" }}>No</th>
              <th style={{ minWidth: 260 }}>Dokumen Arsip</th>
              <th style={{ width: 170 }}>Kategori</th>
              <th style={{ width: 110 }}>Tahun & Tgl</th>
              <th style={{ width: 180 }}>Berkas File</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 180, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat data arsip LPM...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada dokumen arsip yang ditemukan.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: "13px" }}>
                      {hasActiveFilters
                        ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                        : "Belum ada dokumen arsip. Tambahkan dokumen arsip pertama Anda sekarang."}
                    </p>
                    {hasActiveFilters ? (
                      <button className="aa-btn aa-btn-sm" onClick={resetFilters} type="button">
                        Bersihkan Filter
                      </button>
                    ) : (
                      <button
                        className="aa-btn aa-btn-primary aa-btn-sm"
                        onClick={() => setCreateModalOpen(true)}
                        type="button"
                      >
                        + Tambah Arsip Baru
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const catColor = getCategoryColor(item.category);
                const previewUrl = resolveApiUrl(item.file?.url);
                const downloadUrl = resolveApiUrl(item.file?.downloadUrl);

                return (
                  <tr key={item.id}>
                    {/* No Urut */}
                    <td style={{ textAlign: "center", color: "var(--admin-muted)", fontWeight: 600 }}>
                      {firstItem + idx}
                    </td>

                    {/* Judul & Deskripsi */}
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--admin-ink-dark)", fontSize: "14px", lineHeight: 1.4 }}>
                        {item.title}
                      </div>
                      {item.description ? (
                        <div
                          style={{
                            color: "var(--admin-muted)",
                            fontSize: "12.5px",
                            marginTop: 4,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.description}
                        </div>
                      ) : null}
                    </td>

                    {/* Kategori */}
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: "999px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor: catColor.bg,
                          color: catColor.text,
                          border: `1px solid ${catColor.border}`,
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* Tahun & Tanggal */}
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--admin-ink)" }}>{item.year}</div>
                      <small>{formatDateIndo(item.date)}</small>
                    </td>

                    {/* Berkas Dokumen */}
                    <td>
                      {item.file ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {getFileTypeBadge(item.fileType)}
                            <span style={{ fontSize: "11.5px", color: "var(--admin-muted)" }}>
                              {formatFileSize(item.fileSize)}
                            </span>
                          </div>
                          {item.fileName && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--admin-ink)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 160,
                              }}
                              title={item.fileName}
                            >
                              <code>{item.fileName}</code>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            {previewUrl && (
                              <a
                                className="aa-btn aa-btn-sm"
                                href={previewUrl}
                                rel="noopener noreferrer"
                                style={{ padding: "2px 6px", fontSize: "11px", textDecoration: "none" }}
                                target="_blank"
                                title="Lihat Pratinjau Dokumen"
                              >
                                Lihat
                              </a>
                            )}
                            {downloadUrl && (
                              <a
                                className="aa-btn aa-btn-sm"
                                href={downloadUrl}
                                rel="noopener noreferrer"
                                style={{ padding: "2px 6px", fontSize: "11px", textDecoration: "none" }}
                                target="_blank"
                                title="Unduh Berkas"
                              >
                                Unduh
                              </a>
                            )}
                            <button
                              className="aa-btn aa-btn-sm"
                              onClick={() => setUploadingItem(item)}
                              style={{ padding: "2px 6px", fontSize: "11px" }}
                              title="Ganti Berkas Dokumen"
                              type="button"
                            >
                              Ganti
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              fontSize: "11px",
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            Belum Ada File
                          </span>
                          <div>
                            <button
                              className="aa-btn aa-btn-sm aa-btn-primary"
                              onClick={() => setUploadingItem(item)}
                              style={{ padding: "3px 8px", fontSize: "11px" }}
                              type="button"
                            >
                              + Unggah File
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status Badge & Toggle */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                        <span
                          className={`aa-badge ${
                            item.status === "published" ? "aa-badge-published" : "aa-badge-draft"
                          }`}
                        >
                          {item.status === "published" ? "Dipublikasikan" : "Draf"}
                        </span>
                        <button
                          className="aa-btn aa-btn-sm"
                          onClick={() => toggleStatus(item)}
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            color: item.status === "published" ? "#b45309" : "#166534",
                          }}
                          title={
                            item.status === "published"
                              ? "Tarik dari publikasi (ubah ke draf)"
                              : "Terbitkan ke halaman publik"
                          }
                          type="button"
                        >
                          {item.status === "published" ? "Jadikan Draf" : "Terbitkan"}
                        </button>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td>
                      <div className="aa-actions">
                        <button
                          className="aa-btn aa-btn-sm"
                          onClick={() => setEditingItem(item)}
                          title="Edit Arsip"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-danger"
                          onClick={() => setDeletingItem(item)}
                          title="Hapus Arsip"
                          type="button"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <footer className="aa-pagination">
          <button
            className="aa-btn aa-btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            ← Sebelumnya
          </button>
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <button
            className="aa-btn aa-btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            Berikutnya →
          </button>
        </footer>
      )}

      {/* Modal Tambah Arsip */}
      {createModalOpen && (
        <ArchiveModal
          item={null}
          onClose={() => setCreateModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal Edit Arsip */}
      {editingItem && (
        <ArchiveModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal Cepat Upload Dokumen */}
      {uploadingItem && (
        <UploadDocumentModal
          item={uploadingItem}
          onClose={() => setUploadingItem(null)}
          onUploaded={handleSaved}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingItem && (
        <DeleteConfirmModal
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onDeleted={handleSaved}
        />
      )}
    </div>
  );
}

