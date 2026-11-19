"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { errorMessage, resolveApiUrl } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  lpmBenchmarkingAdminApi,
  type AdminBenchmarkingItem,
  type PublishStatus,
} from "@/lib/lpm-benchmarking-admin-api";

const PAGE_SIZE = 10;
const FILE_ACCEPT =
  ".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const CARD_STYLE: React.CSSProperties = {
  background: "#ffffff",
  padding: "14px 18px",
  borderRadius: 10,
  border: "1px solid var(--admin-border, #e2e8ed)",
};
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--admin-line)",
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateIndo(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function validateFile(file: File | null): string | null {
  if (!file) return null;
  if (!/\.(pdf|docx|xlsx)$/i.test(file.name)) return "Format file harus PDF, DOCX, atau XLSX.";
  if (file.size > MAX_FILE_BYTES) return "Ukuran file maksimal 20 MB.";
  return null;
}

function FileTypeBadge({ type }: { type: "PDF" | "DOCX" | "XLSX" | null }) {
  if (!type) return null;
  const color = {
    PDF: { bg: "#fee2e2", text: "#b91c1c" },
    DOCX: { bg: "#dbeafe", text: "#1d4ed8" },
    XLSX: { bg: "#dcfce7", text: "#15803d" },
  }[type];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: color.bg,
        color: color.text,
      }}
    >
      {type}
    </span>
  );
}

// ================= Modal Tambah / Edit =================
function BenchmarkingModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminBenchmarkingItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const todayStr = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(item?.title ?? "");
  const [institution, setInstitution] = useState(item?.institution ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [date, setDate] = useState(item?.date ?? todayStr);
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasExistingFile = Boolean(item?.file);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Judul wajib diisi.");
    if (!date) return setError("Tanggal kegiatan wajib diisi.");
    const fileError = validateFile(file);
    if (fileError) return setError(fileError);
    if (status === "published" && !hasExistingFile && !file) {
      return setError("Dokumen wajib diunggah sebelum data dapat dipublikasikan.");
    }

    setSaving(true);
    setError(null);

    const fields = {
      title: title.trim(),
      institution: institution.trim(),
      label: label.trim(),
      date,
      description: description.trim(),
    };

    try {
      if (item) {
        // Dokumen diunggah lebih dulu agar status "published" tidak ditolak.
        setStep("Memperbarui data...");
        await lpmBenchmarkingAdminApi.update(item.id, { ...fields, ...(status === "draft" ? { status } : {}) });
        if (file) {
          setStep("Mengunggah dokumen ke Google Drive...");
          await lpmBenchmarkingAdminApi.uploadDocument(item.id, file);
        }
        if (status === "published" && item.status !== "published") {
          setStep("Mempublikasikan...");
          await lpmBenchmarkingAdminApi.update(item.id, { status: "published" });
        }
        onSaved("Data benchmarking berhasil diperbarui.");
      } else {
        setStep("Menyimpan draft...");
        const created = await lpmBenchmarkingAdminApi.create({ ...fields, status: "draft" });
        if (file) {
          setStep("Mengunggah dokumen ke Google Drive...");
          await lpmBenchmarkingAdminApi.uploadDocument(created.id, file);
          if (status === "published") {
            setStep("Mempublikasikan...");
            await lpmBenchmarkingAdminApi.update(created.id, { status: "published" });
          }
        }
        onSaved(
          file
            ? status === "published"
              ? "Benchmarking berhasil ditambahkan dan dipublikasikan."
              : "Benchmarking beserta dokumen berhasil disimpan sebagai draf."
            : "Draft tersimpan. Unggah dokumen agar dapat dipublikasikan."
        );
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setStep("");
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 640 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">{item ? "Edit Benchmarking" : "Tambah Benchmarking"}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          <div className="aa-field">
            <span>
              Judul Kegiatan <strong style={{ color: "#b3261e" }}>*</strong>
            </span>
            <input
              id={`${uid}-title`}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Benchmarking LPM Universitas LIA ke Universitas Nasional"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <span>Institusi Tujuan / Mitra</span>
              <input
                id={`${uid}-inst`}
                maxLength={200}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Contoh: Universitas Nasional"
                type="text"
                value={institution}
              />
            </div>
            <div className="aa-field" style={{ maxWidth: 190 }}>
              <span>Label Kartu</span>
              <input
                id={`${uid}-label`}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="DOKUMENTASI"
                type="text"
                value={label}
              />
            </div>
            <div className="aa-field" style={{ maxWidth: 170 }}>
              <span>
                Tanggal <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input id={`${uid}-date`} onChange={(e) => setDate(e.target.value)} required type="date" value={date} />
            </div>
          </div>

          <div className="aa-field">
            <span>Deskripsi (Opsional)</span>
            <textarea
              id={`${uid}-desc`}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ringkasan kegiatan berbagi informasi dan praktik baik penjaminan mutu..."
              rows={3}
              value={description}
            />
          </div>

          <div
            style={{
              padding: "14px 16px",
              background: "#f8fafc",
              border: "1px dashed var(--admin-line, #cbd5e1)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Dokumen (PDF, DOCX, XLSX — Maks. 20 MB, disimpan di Google Drive)</span>

            {item?.fileName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, minWidth: 0 }}>
                <FileTypeBadge type={item.fileType} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.fileName}>
                  {item.fileName}
                </span>
                <span style={{ color: "var(--admin-muted)", fontSize: 11 }}>({formatFileSize(item.fileSize)})</span>
              </div>
            )}

            <label htmlFor={`${uid}-file`} style={{ fontSize: 12, color: "var(--admin-muted)" }}>
              {item?.fileName ? "Pilih file baru untuk mengganti dokumen lama:" : "Pilih file dokumen:"}
            </label>
            <input
              accept={FILE_ACCEPT}
              id={`${uid}-file`}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              type="file"
            />
            {file && (
              <div style={{ fontSize: 12, color: "#166534" }}>
                File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </div>
            )}
          </div>

          <div className="aa-field">
            <span>Status Publikasi</span>
            <div style={{ display: "flex", gap: 20, marginTop: 4, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input checked={status === "draft"} name={`${uid}-status`} onChange={() => setStatus("draft")} type="radio" />
                <span>Draf (hanya admin)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input checked={status === "published"} name={`${uid}-status`} onChange={() => setStatus("published")} type="radio" />
                <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (tampil di website)</span>
              </label>
            </div>
            {!hasExistingFile && !file && status === "published" && (
              <small style={{ color: "#b45309", marginTop: 4 }}>⚠️ Dokumen wajib dilampirkan untuk status Dipublikasikan.</small>
            )}
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 12 }}>
            <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? step || "Menyimpan..." : item ? "Simpan Perubahan" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Upload / Ganti Dokumen =================
function UploadDocumentModal({
  item,
  onClose,
  onDone,
}: {
  item: AdminBenchmarkingItem;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [publishAfter, setPublishAfter] = useState(item.status === "draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Pilih dokumen terlebih dahulu.");
    const fileError = validateFile(file);
    if (fileError) return setError(fileError);

    setBusy(true);
    setError(null);
    try {
      await lpmBenchmarkingAdminApi.uploadDocument(item.id, file);
      if (publishAfter && item.status === "draft") {
        await lpmBenchmarkingAdminApi.update(item.id, { status: "published" });
        onDone(`Dokumen "${item.title}" diunggah dan data dipublikasikan.`);
      } else {
        onDone(`Dokumen "${item.title}" berhasil diunggah.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 520 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">{item.fileName ? "Ganti Dokumen" : "Unggah Dokumen"}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>
        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}
          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
          {item.fileName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <FileTypeBadge type={item.fileType} />
              <strong>{item.fileName}</strong>
              <span style={{ color: "var(--admin-muted)" }}>({formatFileSize(item.fileSize)})</span>
            </div>
          )}
          <div className="aa-field">
            <span>Pilih dokumen (PDF, DOCX, XLSX — Maks. 20 MB)</span>
            <input accept={FILE_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} required type="file" />
          </div>
          {item.status === "draft" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input checked={publishAfter} onChange={(e) => setPublishAfter(e.target.checked)} type="checkbox" />
              <span>Langsung publikasikan setelah dokumen terunggah</span>
            </label>
          )}
          <div className="aa-modal-actions" style={{ marginTop: 10 }}>
            <button className="aa-btn" disabled={busy} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={busy} type="submit">
              {busy ? "Mengunggah..." : "Unggah Sekarang"}
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
  item: AdminBenchmarkingItem;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await lpmBenchmarkingAdminApi.remove(item.id);
      onDeleted(`"${item.title}" berhasil dihapus.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 460 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          Hapus Benchmarking?
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 8px", fontSize: 14, lineHeight: 1.5 }}>
          Anda yakin ingin menghapus <strong>&ldquo;{item.title}&rdquo;</strong>?
        </p>
        {item.fileName && (
          <div style={{ padding: "8px 12px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 6, fontSize: 12, color: "#9f1239" }}>
            ⚠️ Berkas <strong>{item.fileName}</strong> di Google Drive juga akan dihapus.
          </div>
        )}
        <div className="aa-modal-actions" style={{ marginTop: 14 }}>
          <button className="aa-btn" disabled={busy} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-danger" disabled={busy} onClick={confirm} type="button">
            {busy ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Halaman Utama =================
export function BenchmarkingAdmin() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminBenchmarkingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [reload, setReload] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminBenchmarkingItem | null>(null);
  const [uploading, setUploading] = useState<AdminBenchmarkingItem | null>(null);
  const [deleting, setDeleting] = useState<AdminBenchmarkingItem | null>(null);

  useEffect(() => {
    lpmBenchmarkingAdminApi
      .filterOptions()
      .then((res) => setYears(res.years || []))
      .catch(() => {});
  }, [reload]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    lpmBenchmarkingAdminApi
      .list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        year: year ? Number(year) : undefined,
        status: (status as PublishStatus) || undefined,
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
  }, [debouncedSearch, year, status, page, reload]);

  function handleSaved(msg: string) {
    setNotice(msg);
    setReload((k) => k + 1);
  }

  async function toggleStatus(item: AdminBenchmarkingItem) {
    if (item.status === "draft" && !item.file) {
      setNotice(`"${item.title}" belum memiliki dokumen. Unggah dokumen sebelum menerbitkan.`);
      setUploading(item);
      return;
    }
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await lpmBenchmarkingAdminApi.update(item.id, { status: next });
      setNotice(next === "published" ? `"${item.title}" telah dipublikasikan.` : `"${item.title}" diubah ke Draf.`);
      setReload((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const hasFilters = Boolean(search || year || status);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  function resetFilters() {
    setSearch("");
    setYear("");
    setStatus("");
    setPage(1);
  }

  const publishedCount = items.filter((i) => i.status === "published").length;
  const withFileCount = items.filter((i) => i.file).length;

  return (
    <div className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Benchmarking LPM</h1>
          <p className="aa-subtitle">
            Kelola kegiatan benchmarking penjaminan mutu beserta dokumen pendukungnya (tersimpan di Google Drive).
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            className="aa-btn"
            href="/lpm/kegiatan-lpm/benchmarking"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            target="_blank"
          >
            <span>Halaman Publik</span>
            <AdminIcon name="external" size={14} />
          </Link>
          <button
            className="aa-btn aa-btn-primary"
            onClick={() => setCreating(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            type="button"
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
            <span>Tambah Benchmarking</span>
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: "var(--admin-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Data</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{total}</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Dipublikasikan (halaman ini)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
            {publishedCount} <span style={{ fontSize: 14, color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
          </div>
        </div>
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: "var(--admin-blue)", fontWeight: 600, textTransform: "uppercase" }}>Memiliki Dokumen (halaman ini)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--admin-blue)", marginTop: 4 }}>
            {withFileCount} <span style={{ fontSize: 14, color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
          </div>
        </div>
      </section>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}
      {error && <p className="aa-error">{error}</p>}

      <section
        style={{
          background: "#ffffff",
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--admin-border, #e2e8ed)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <input
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari judul, institusi, deskripsi, atau nama file..."
            style={{ ...INPUT_STYLE, gridColumn: "span 2" }}
            type="text"
            value={search}
          />
          <select
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            style={INPUT_STYLE}
            value={year}
          >
            <option value="">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={INPUT_STYLE}
            value={status}
          >
            <option value="">Semua Status</option>
            <option value="published">Dipublikasikan</option>
            <option value="draft">Draf</option>
          </select>
          <button className="aa-btn" disabled={!hasFilters} onClick={resetFilters} style={{ whiteSpace: "nowrap" }} type="button">
            Reset Filter
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--admin-muted)" }}>
          Menampilkan <strong>{firstItem}</strong>–<strong>{lastItem}</strong> dari <strong>{total}</strong> data
          {hasFilters ? " (filter aktif)" : ""}
        </div>
      </section>

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: "center" }}>No</th>
              <th style={{ minWidth: 260 }}>Kegiatan</th>
              <th style={{ width: 160 }}>Institusi</th>
              <th style={{ width: 120 }}>Tanggal</th>
              <th style={{ width: 200 }}>Dokumen</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat data benchmarking...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada data benchmarking.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>
                      {hasFilters ? "Coba ubah kata kunci atau bersihkan filter." : "Belum ada data. Tambahkan kegiatan benchmarking pertama."}
                    </p>
                    {hasFilters ? (
                      <button className="aa-btn aa-btn-sm" onClick={resetFilters} type="button">
                        Bersihkan Filter
                      </button>
                    ) : (
                      <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreating(true)} type="button">
                        + Tambah Benchmarking
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const previewUrl = resolveApiUrl(item.file?.url);
                const downloadUrl = resolveApiUrl(item.file?.downloadUrl);
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: "center", color: "var(--admin-muted)", fontWeight: 600 }}>{firstItem + idx}</td>
                    <td>
                      {item.label && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--admin-blue)" }}>
                          {item.label}
                        </span>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{item.title}</div>
                      {item.description && (
                        <div
                          style={{
                            color: "var(--admin-muted)",
                            fontSize: 12.5,
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
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>{item.institution || "-"}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.year}</div>
                      <small>{formatDateIndo(item.date)}</small>
                    </td>
                    <td>
                      {item.file ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FileTypeBadge type={item.fileType} />
                            <span style={{ fontSize: 11.5, color: "var(--admin-muted)" }}>{formatFileSize(item.fileSize)}</span>
                          </div>
                          {item.fileName && (
                            <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={item.fileName}>
                              <code>{item.fileName}</code>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            {previewUrl && (
                              <a className="aa-btn aa-btn-sm" href={previewUrl} rel="noopener noreferrer" style={{ padding: "2px 6px", fontSize: 11, textDecoration: "none" }} target="_blank">
                                Lihat
                              </a>
                            )}
                            {downloadUrl && (
                              <a className="aa-btn aa-btn-sm" href={downloadUrl} rel="noopener noreferrer" style={{ padding: "2px 6px", fontSize: 11, textDecoration: "none" }} target="_blank">
                                Unduh
                              </a>
                            )}
                            <button className="aa-btn aa-btn-sm" onClick={() => setUploading(item)} style={{ padding: "2px 6px", fontSize: 11 }} type="button">
                              Ganti
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                            Belum Ada File
                          </span>
                          <div>
                            <button className="aa-btn aa-btn-sm aa-btn-primary" onClick={() => setUploading(item)} style={{ padding: "3px 8px", fontSize: 11 }} type="button">
                              + Unggah File
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                        <span className={`aa-badge ${item.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}>
                          {item.status === "published" ? "Dipublikasikan" : "Draf"}
                        </span>
                        <button
                          className="aa-btn aa-btn-sm"
                          onClick={() => toggleStatus(item)}
                          style={{ fontSize: 11, padding: "2px 6px", color: item.status === "published" ? "#b45309" : "#166534" }}
                          type="button"
                        >
                          {item.status === "published" ? "Jadikan Draf" : "Terbitkan"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="aa-actions">
                        <button className="aa-btn aa-btn-sm" onClick={() => setEditing(item)} type="button">
                          Edit
                        </button>
                        <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => setDeleting(item)} type="button">
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

      {totalPages > 1 && (
        <footer className="aa-pagination">
          <button className="aa-btn aa-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">
            ← Sebelumnya
          </button>
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} type="button">
            Berikutnya →
          </button>
        </footer>
      )}

      {creating && <BenchmarkingModal item={null} onClose={() => setCreating(false)} onSaved={handleSaved} />}
      {editing && <BenchmarkingModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {uploading && <UploadDocumentModal item={uploading} onClose={() => setUploading(null)} onDone={handleSaved} />}
      {deleting && <DeleteConfirmModal item={deleting} onClose={() => setDeleting(null)} onDeleted={handleSaved} />}
    </div>
  );
}
