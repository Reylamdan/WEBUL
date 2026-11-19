"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { errorMessage, resolveApiUrl } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  lpmAuditReportAdminApi,
  type AdminAuditReportItem,
  type PublishStatus,
} from "@/lib/lpm-audit-report-admin-api";

const PAGE_SIZE = 10;
const FILE_ACCEPT =
  ".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--admin-line)",
};

const autoTitle = (year: number | string) => `Laporan Tahunan Audit Mutu Internal ${year}`;

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: color.bg, color: color.text }}>
      {type}
    </span>
  );
}

// ================= Modal Tambah / Edit =================
function ReportModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminAuditReportItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(item?.year ?? currentYear);
  const [title, setTitle] = useState(item?.title ?? autoTitle(currentYear));
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Judul ikut berubah mengikuti tahun selama masih berupa judul otomatis.
  function handleYearChange(next: number) {
    if (title === autoTitle(year)) setTitle(autoTitle(next));
    setYear(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return setError("Tahun tidak valid (1900 - 2100).");
    if (!title.trim()) return setError("Judul laporan wajib diisi.");
    const fileError = validateFile(file);
    if (fileError) return setError(fileError);

    setSaving(true);
    setError(null);

    const fields = { year, title: title.trim(), description: description.trim() };
    let savedId = item?.id ?? null;

    try {
      if (item) {
        setStep("Memperbarui data...");
        await lpmAuditReportAdminApi.update(item.id, { ...fields, status });
      } else {
        setStep("Menyimpan data...");
        // Dibuat sebagai draf dulu; dipublikasikan setelah dokumen berhasil diunggah.
        const created = await lpmAuditReportAdminApi.create({ ...fields, status: file ? "draft" : status });
        savedId = created.id;
      }

      if (file && savedId) {
        setStep("Mengunggah dokumen ke Google Drive...");
        try {
          await lpmAuditReportAdminApi.uploadDocument(savedId, file);
        } catch (uploadErr) {
          onSaved(`Data laporan tersimpan, tetapi dokumen gagal diunggah: ${errorMessage(uploadErr)} Silakan unggah ulang dari tabel.`);
          onClose();
          return;
        }
        if (!item && status === "published") {
          setStep("Mempublikasikan...");
          await lpmAuditReportAdminApi.update(savedId, { status: "published" });
        }
      }

      onSaved(item ? "Laporan berhasil diperbarui." : "Laporan baru berhasil ditambahkan.");
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
      <div className="aa-modal" style={{ maxWidth: 620 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">{item ? "Edit Laporan Audit Mutu" : "Tambah Laporan Audit Mutu"}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          <div className="aa-row">
            <div className="aa-field" style={{ maxWidth: 140 }}>
              <span>
                Tahun <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input
                id={`${uid}-year`}
                max={2100}
                min={1900}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                required
                type="number"
                value={year}
              />
            </div>
            <div className="aa-field">
              <span>
                Judul <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input id={`${uid}-title`} maxLength={200} onChange={(e) => setTitle(e.target.value)} required type="text" value={title} />
            </div>
          </div>

          <div className="aa-field">
            <span>Deskripsi</span>
            <textarea
              id={`${uid}-desc`}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informasi dan dokumen laporan tahunan Audit Mutu Internal tahun ..."
              rows={3}
              value={description}
            />
          </div>

          <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px dashed var(--admin-line, #cbd5e1)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Dokumen laporan (PDF, DOCX, XLSX — Maks. 20 MB, disimpan di Google Drive)</span>

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
              {item?.fileName ? "Pilih file baru untuk mengganti dokumen lama:" : "Pilih file dokumen (opsional, bisa diunggah nanti):"}
            </label>
            <input accept={FILE_ACCEPT} id={`${uid}-file`} onChange={(e) => setFile(e.target.files?.[0] || null)} type="file" />
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
            {status === "published" && !item?.file && !file && (
              <small style={{ color: "#b45309", marginTop: 4 }}>
                Tanpa dokumen, website menampilkan “Arsip belum tersedia” untuk tahun ini.
              </small>
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

// ================= Modal Upload / Ganti / Hapus Dokumen =================
function DocumentModal({
  item,
  onClose,
  onDone,
}: {
  item: AdminAuditReportItem;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
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
      await lpmAuditReportAdminApi.uploadDocument(item.id, file);
      onDone(`Dokumen laporan ${item.year} berhasil diunggah.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument() {
    setBusy(true);
    setError(null);
    try {
      await lpmAuditReportAdminApi.removeDocument(item.id);
      onDone(`Dokumen laporan ${item.year} dihapus dari Google Drive.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
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
          <div className="aa-modal-actions" style={{ marginTop: 10, justifyContent: "space-between" }}>
            <div>
              {item.fileName && (
                <button className="aa-btn aa-btn-danger" disabled={busy} onClick={removeDocument} type="button">
                  Hapus Dokumen
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="aa-btn" disabled={busy} onClick={onClose} type="button">
                Batal
              </button>
              <button className="aa-btn aa-btn-primary" disabled={busy} type="submit">
                {busy ? "Memproses..." : "Unggah Sekarang"}
              </button>
            </div>
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
  item: AdminAuditReportItem;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await lpmAuditReportAdminApi.remove(item.id);
      onDeleted(`Laporan ${item.year} berhasil dihapus.`);
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
          Hapus Laporan Audit Mutu?
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
export function LaporanAuditMutuAdmin() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminAuditReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAuditReportItem | null>(null);
  const [docItem, setDocItem] = useState<AdminAuditReportItem | null>(null);
  const [deleting, setDeleting] = useState<AdminAuditReportItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    lpmAuditReportAdminApi
      .list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
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
  }, [debouncedSearch, status, page, reload]);

  function handleSaved(msg: string) {
    setNotice(msg);
    setReload((k) => k + 1);
  }

  async function toggleStatus(item: AdminAuditReportItem) {
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await lpmAuditReportAdminApi.update(item.id, { status: next });
      setNotice(next === "published" ? `Laporan ${item.year} telah dipublikasikan.` : `Laporan ${item.year} diubah ke Draf.`);
      setReload((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
  }

  const hasFilters = Boolean(search || status);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Laporan Tahunan Audit Mutu Internal</h1>
          <p className="aa-subtitle">
            Kelola laporan tahunan Audit Mutu Internal per tahun beserta dokumennya (tersimpan di Google Drive).
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            className="aa-btn"
            href="/lpm/laporan-lpm/laporan-tahunan-audit-mutu-internal"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            target="_blank"
          >
            <span>Halaman Publik</span>
            <AdminIcon name="external" size={14} />
          </Link>
          <button className="aa-btn aa-btn-primary" onClick={() => setCreating(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }} type="button">
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
            <span>Tambah Laporan</span>
          </button>
        </div>
      </header>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}
      {error && <p className="aa-error">{error}</p>}

      <section style={{ background: "#ffffff", padding: 16, borderRadius: 12, border: "1px solid var(--admin-border, #e2e8ed)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <input
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari tahun, judul, deskripsi, atau nama file..."
            style={{ ...INPUT_STYLE, gridColumn: "span 2" }}
            type="text"
            value={search}
          />
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
          Menampilkan <strong>{firstItem}</strong>–<strong>{lastItem}</strong> dari <strong>{total}</strong> laporan
          {hasFilters ? " (filter aktif)" : ""}
        </div>
      </section>

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 80, textAlign: "center" }}>Tahun</th>
              <th style={{ minWidth: 280 }}>Laporan</th>
              <th style={{ width: 210 }}>Dokumen</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat laporan audit mutu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada laporan audit mutu.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>
                      {hasFilters ? "Coba ubah kata kunci atau bersihkan filter." : "Belum ada laporan. Tambahkan laporan tahun pertama."}
                    </p>
                    {hasFilters ? (
                      <button className="aa-btn aa-btn-sm" onClick={resetFilters} type="button">
                        Bersihkan Filter
                      </button>
                    ) : (
                      <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreating(true)} type="button">
                        + Tambah Laporan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const previewUrl = resolveApiUrl(item.file?.url);
                const downloadUrl = resolveApiUrl(item.file?.downloadUrl);
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: "center", fontWeight: 800, fontSize: 15 }}>{item.year}</td>
                    <td>
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
                    <td>
                      {item.file ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FileTypeBadge type={item.fileType} />
                            <span style={{ fontSize: 11.5, color: "var(--admin-muted)" }}>{formatFileSize(item.fileSize)}</span>
                          </div>
                          {item.fileName && (
                            <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }} title={item.fileName}>
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
                            <button className="aa-btn aa-btn-sm" onClick={() => setDocItem(item)} style={{ padding: "2px 6px", fontSize: 11 }} type="button">
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
                            <button className="aa-btn aa-btn-sm aa-btn-primary" onClick={() => setDocItem(item)} style={{ padding: "3px 8px", fontSize: 11 }} type="button">
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

      {creating && <ReportModal item={null} onClose={() => setCreating(false)} onSaved={handleSaved} />}
      {editing && <ReportModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {docItem && <DocumentModal item={docItem} onClose={() => setDocItem(null)} onDone={handleSaved} />}
      {deleting && <DeleteConfirmModal item={deleting} onClose={() => setDeleting(null)} onDeleted={handleSaved} />}
    </div>
  );
}
