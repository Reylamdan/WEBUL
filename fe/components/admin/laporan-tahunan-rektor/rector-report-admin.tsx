"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  rectorReportAdminApi,
  type AdminRectorReportItem,
  type PublishStatus,
  type RectorReportInput,
  type RectorReportSettings,
  type RectorReportSettingsInput,
} from "@/lib/rector-report-admin-api";

const PAGE_SIZE = 10;

// ================= Modal Tambah / Edit Laporan =================
function ReportModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminRectorReportItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState<RectorReportInput>({
    year: item?.year ?? currentYear,
    title: item?.title ?? `Laporan Tahunan Rektor ${currentYear}`,
    description:
      item?.description ??
      `Dokumen laporan tahunan Rektor Universitas LIA tahun ${currentYear} yang dipublikasikan melalui situs resmi universitas.`,
    coverUrl: item?.coverUrl ?? "",
    fileUrl: item?.fileUrl ?? "",
    contactEmail: item?.contactEmail ?? "",
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? "published",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Judul laporan wajib diisi.");
      return;
    }
    if (!form.year || form.year < 1900 || form.year > 2100) {
      setError("Tahun laporan tidak valid (1900 - 2100).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: RectorReportInput = {
        ...form,
        title: form.title.trim(),
        year: Number(form.year),
        description: form.description?.trim() || "",
        coverUrl: form.coverUrl?.trim() || null,
        fileUrl: form.fileUrl?.trim() || null,
        contactEmail: form.contactEmail?.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (item) {
        await rectorReportAdminApi.update(item.id, payload);
        onSaved("Laporan tahunan rektor berhasil diperbarui.");
      } else {
        await rectorReportAdminApi.create(payload);
        onSaved("Laporan tahunan rektor baru berhasil ditambahkan.");
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 600 }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">
            {item ? "Edit Laporan Tahunan Rektor" : "Tambah Laporan Tahunan Rektor"}
          </h2>
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
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm((cur) => ({
                    ...cur,
                    year: val,
                    title: cur.title.startsWith("Laporan Tahunan Rektor ") ? `Laporan Tahunan Rektor ${val}` : cur.title,
                  }));
                }}
                required
                type="number"
                value={form.year}
              />
            </div>

            <div className="aa-field">
              <span>
                Judul Laporan <strong style={{ color: "#b3261e" }}>*</strong>
              </span>
              <input
                id={`${uid}-title`}
                maxLength={200}
                onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
                placeholder="Contoh: Laporan Tahunan Rektor 2025"
                required
                type="text"
                value={form.title}
              />
            </div>
          </div>

          <div className="aa-field">
            <span>Deskripsi / Ringkasan Laporan</span>
            <textarea
              id={`${uid}-desc`}
              maxLength={2000}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Keterangan singkat mengenai dokumen laporan tahunan ini..."
              rows={3}
              value={form.description}
            />
          </div>

          <div className="aa-field">
            <span>URL / Lokasi Gambar Sampul (Cover)</span>
            <input
              id={`${uid}-cover`}
              onChange={(e) => setForm((cur) => ({ ...cur, coverUrl: e.target.value }))}
              placeholder="Contoh: /Laporantahunanrektor2025.jpg atau https://..."
              type="text"
              value={form.coverUrl || ""}
            />
            <small style={{ color: "var(--admin-muted)", fontSize: "11.5px" }}>
              Bisa berupa berkas statis di folder public (mis. <code>/Laporantahunanrektor2024.jpg</code>) atau URL eksternal gambar.
            </small>
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <span>URL Berkas Dokumen (Opsional)</span>
              <input
                id={`${uid}-file`}
                onChange={(e) => setForm((cur) => ({ ...cur, fileUrl: e.target.value }))}
                placeholder="https://drive.google.com/... atau URL dokumen PDF"
                type="text"
                value={form.fileUrl || ""}
              />
            </div>

            <div className="aa-field" style={{ maxWidth: 120 }}>
              <span>Urutan Tampilan</span>
              <input
                id={`${uid}-order`}
                max={9999}
                min={0}
                onChange={(e) => setForm((cur) => ({ ...cur, sortOrder: Number(e.target.value) || 0 }))}
                type="number"
                value={form.sortOrder}
              />
            </div>
          </div>

          <div className="aa-field">
            <span>Email Permintaan Khusus (Opsional)</span>
            <input
              id={`${uid}-email`}
              onChange={(e) => setForm((cur) => ({ ...cur, contactEmail: e.target.value }))}
              placeholder="Biarkan kosong untuk memakai email default pengaturan"
              type="email"
              value={form.contactEmail || ""}
            />
          </div>

          <div className="aa-field">
            <span>Status Publikasi</span>
            <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13.5px", cursor: "pointer" }}>
                <input
                  checked={form.status === "published"}
                  name="report-status"
                  onChange={() => setForm((cur) => ({ ...cur, status: "published" }))}
                  type="radio"
                  value="published"
                />
                <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (Tampil di website publik)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13.5px", cursor: "pointer" }}>
                <input
                  checked={form.status === "draft"}
                  name="report-status"
                  onChange={() => setForm((cur) => ({ ...cur, status: "draft" }))}
                  type="radio"
                  value="draft"
                />
                <span>Draft (Hanya terlihat di admin)</span>
              </label>
            </div>
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 10 }}>
            <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah Laporan"}
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
  item: AdminRectorReportItem;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await rectorReportAdminApi.remove(item.id);
      onDeleted(`Laporan "${item.title}" berhasil dihapus.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 440 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          Hapus Laporan Tahunan Rektor?
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 12px", fontSize: "14px", lineHeight: 1.5 }}>
          Anda yakin ingin menghapus data laporan:
          <br />
          <strong>&ldquo;{item.title}&rdquo; (Tahun {item.year})</strong>?
        </p>
        <div className="aa-modal-actions">
          <button className="aa-btn" disabled={deleting} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-danger" disabled={deleting} onClick={handleDelete} type="button">
            {deleting ? "Menghapus..." : "Ya, Hapus Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Komponen Utama =================
export function RectorReportAdmin() {
  const [activeTab, setActiveTab] = useState<"reports" | "settings">("reports");

  // State untuk Tab Laporan
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdminRectorReportItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloadToken, setReloadToken] = useState(0);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminRectorReportItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminRectorReportItem | null>(null);

  // State untuk Tab Pengaturan
  const [settings, setSettings] = useState<RectorReportSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<RectorReportSettingsInput>({
    heroTitle: "",
    heroDescription: "",
    archiveTitle: "",
    contactEmail: "",
  });

  // Notifikasi
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ambil data laporan
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    rectorReportAdminApi
      .list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
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
  }, [debouncedSearch, selectedYear, selectedStatus, page, reloadToken]);

  // Ambil pengaturan halaman
  useEffect(() => {
    let active = true;
    setSettingsLoading(true);

    rectorReportAdminApi
      .getSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setSettingsForm({
          heroTitle: data.heroTitle,
          heroDescription: data.heroDescription,
          archiveTitle: data.archiveTitle,
          contactEmail: data.contactEmail,
        });
      })
      .catch((err) => {
        if (active) console.error("Gagal mengambil pengaturan:", err);
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  // Simpan Pengaturan
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setError(null);

    try {
      const updated = await rectorReportAdminApi.updateSettings(settingsForm);
      setSettings(updated);
      setNotice("Pengaturan halaman Laporan Tahunan Rektor berhasil diperbarui.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSettingsSaving(false);
    }
  }

  // Quick toggle status publikasi
  async function toggleStatus(item: AdminRectorReportItem) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await rectorReportAdminApi.update(item.id, { status: nextStatus });
      setNotice(
        nextStatus === "published"
          ? `Laporan "${item.title}" berhasil dipublikasikan.`
          : `Laporan "${item.title}" diubah menjadi Draf.`
      );
      setReloadToken((k) => k + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleSaved(msg: string) {
    setNotice(msg);
    setReloadToken((k) => k + 1);
  }

  // Statistik Cepat
  const stats = useMemo(() => {
    const publishedCount = items.filter((i) => i.status === "published").length;
    const draftCount = items.filter((i) => i.status === "draft").length;
    const withCoverCount = items.filter((i) => Boolean(i.coverUrl)).length;
    return { publishedCount, draftCount, withCoverCount };
  }, [items]);

  const hasActiveFilters = Boolean(search || selectedYear || selectedStatus);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  // Ambil daftar tahun unik yang ada pada data
  const availableYears = useMemo(() => {
    const setYears = new Set<number>();
    items.forEach((item) => {
      if (item.year) setYears.add(item.year);
    });
    return Array.from(setYears).sort((a, b) => b - a);
  }, [items]);

  return (
    <div className="aa-page">
      {/* Header Utama */}
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Laporan Tahunan Rektor</h1>
          <p className="aa-subtitle">
            Kelola arsip dokumen laporan tahunan Rektor Universitas LIA yang dipublikasikan setiap tahun.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            className="aa-btn"
            href="/laporan-tahunan-rektor"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            target="_blank"
            title="Buka Halaman Publik Laporan Tahunan Rektor"
          >
            <span>Halaman Publik</span>
            <AdminIcon name="external" size={14} />
          </Link>

          {activeTab === "reports" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setCreateModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              type="button"
            >
              <span style={{ fontSize: "16px", fontWeight: 700 }}>+</span>
              <span>Tambah Laporan Baru</span>
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav aria-label="Tab Menu" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "reports" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reports")}
          type="button"
        >
          Daftar Arsip Laporan
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Halaman & Kontak
        </button>
      </nav>

      {/* Notifikasi & Error */}
      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: "12px", marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}

      {error && <p className="aa-error">{error}</p>}

      {activeTab === "reports" ? (
        <>
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
                Total Laporan Terdata
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
                Dipublikasikan (Halaman Ini)
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
                Draf (Halaman Ini)
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
                Memiliki Gambar Sampul
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--admin-blue)", marginTop: 4 }}>
                {stats.withCoverCount} <span style={{ fontSize: "14px", color: "var(--admin-muted)", fontWeight: 500 }}>/ {items.length}</span>
              </div>
            </div>
          </section>

          {/* Filter & Search Bar */}
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
                gridTemplateColumns: "1fr 160px 160px auto",
                gap: 10,
              }}
            >
              <div>
                <input
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari judul laporan atau deskripsi..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
                  type="text"
                  value={search}
                />
              </div>

              <div>
                <select
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
                  value={selectedYear}
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--admin-line)" }}
                  value={selectedStatus}
                >
                  <option value="">Semua Status</option>
                  <option value="published">Dipublikasikan</option>
                  <option value="draft">Draf</option>
                </select>
              </div>

              <div>
                <button
                  className="aa-btn"
                  disabled={!hasActiveFilters}
                  onClick={() => {
                    setSearch("");
                    setSelectedYear("");
                    setSelectedStatus("");
                    setPage(1);
                  }}
                  style={{ whiteSpace: "nowrap" }}
                  type="button"
                >
                  Reset Filter
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "var(--admin-muted)" }}>
              <span>
                Menampilkan data ke-<strong>{firstItem}</strong> sampai <strong>{lastItem}</strong> dari total <strong>{total}</strong> dokumen laporan
              </span>
              {hasActiveFilters && <span>(Filter aktif)</span>}
            </div>
          </section>

          {/* Tabel Data Laporan */}
          <section className="aa-table-wrap">
            <table className="aa-table">
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: "center" }}>No</th>
                  <th style={{ width: 90, textAlign: "center" }}>Sampul</th>
                  <th style={{ width: 90 }}>Tahun</th>
                  <th style={{ minWidth: 260 }}>Judul & Keterangan</th>
                  <th style={{ width: 150 }}>Tautan Berkas</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 160, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                      Memuat data laporan tahunan rektor...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="aa-empty">
                        <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada laporan tahunan rektor yang ditemukan.</p>
                        <p style={{ margin: "4px 0 14px", fontSize: "13px" }}>
                          {hasActiveFilters
                            ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                            : "Belum ada arsip laporan. Tambahkan laporan tahunan pertama sekarang."}
                        </p>
                        <button
                          className="aa-btn aa-btn-primary aa-btn-sm"
                          onClick={() => setCreateModalOpen(true)}
                          type="button"
                        >
                          + Tambah Laporan Baru
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "var(--admin-muted)", fontWeight: 600 }}>
                        {firstItem + idx}
                      </td>

                      {/* Sampul Thumbnail */}
                      <td style={{ textAlign: "center" }}>
                        {item.coverUrl ? (
                          <div
                            style={{
                              width: 50,
                              height: 70,
                              position: "relative",
                              borderRadius: 4,
                              overflow: "hidden",
                              margin: "0 auto",
                              backgroundColor: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <Image
                              alt={`Sampul ${item.title}`}
                              className="object-cover"
                              fill
                              sizes="50px"
                              src={item.coverUrl}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 50,
                              height: 70,
                              borderRadius: 4,
                              background: "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto",
                              fontSize: "10px",
                              color: "#94a3b8",
                              border: "1px dashed #cbd5e1",
                            }}
                          >
                            No Cover
                          </div>
                        )}
                      </td>

                      {/* Tahun */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        >
                          {item.year}
                        </span>
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
                        {item.contactEmail && (
                          <small style={{ display: "block", color: "var(--admin-blue)", marginTop: 4, fontSize: "11.5px" }}>
                            Email khusus: {item.contactEmail}
                          </small>
                        )}
                      </td>

                      {/* Berkas Dokumen */}
                      <td>
                        {item.fileUrl ? (
                          <a
                            className="aa-btn aa-btn-sm"
                            href={item.fileUrl}
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", fontSize: "12px", padding: "4px 8px" }}
                            target="_blank"
                            title="Buka Berkas Laporan"
                          >
                            Buka File ↗
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--admin-muted)" }}>
                            Permintaan email
                          </span>
                        )}
                      </td>

                      {/* Status */}
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
                            title="Edit Laporan"
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-sm aa-btn-danger"
                            onClick={() => setDeletingItem(item)}
                            title="Hapus Laporan"
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
        </>
      ) : (
        /* Tab 2: Pengaturan Halaman & Kontak */
        <section className="aa-card-box" style={{ maxWidth: 760 }}>
          <h2 className="aa-section-title">Pengaturan Teks Halaman & Email Kontak</h2>
          <p style={{ margin: "0 0 14px", fontSize: "13.5px", color: "var(--admin-muted)" }}>
            Atur judul, deskripsi banner utama, dan alamat email tujuan penerima saat pengunjung menekan tombol &ldquo;Minta Laporan&rdquo;.
          </p>

          {settingsLoading ? (
            <p style={{ color: "var(--admin-muted)", padding: "20px 0" }}>Memuat pengaturan...</p>
          ) : (
            <form className="aa-form" onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="aa-field">
                <span>
                  Judul Utama Halaman (Hero Title) <strong style={{ color: "#b3261e" }}>*</strong>
                </span>
                <input
                  maxLength={200}
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
                  required
                  type="text"
                  value={settingsForm.heroTitle || ""}
                />
              </div>

              <div className="aa-field">
                <span>Deskripsi Halaman (Hero Description)</span>
                <textarea
                  maxLength={1000}
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroDescription: e.target.value }))}
                  rows={3}
                  value={settingsForm.heroDescription || ""}
                />
              </div>

              <div className="aa-field">
                <span>Judul Bagian Daftar Arsip (Section Heading)</span>
                <input
                  maxLength={200}
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, archiveTitle: e.target.value }))}
                  placeholder="Contoh: Arsip laporan"
                  type="text"
                  value={settingsForm.archiveTitle || ""}
                />
              </div>

              <div className="aa-field">
                <span>
                  Email Kontak Permintaan Laporan (Mailto) <strong style={{ color: "#b3261e" }}>*</strong>
                </span>
                <input
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, contactEmail: e.target.value }))}
                  placeholder="Contoh: humas@universitaslia.ac.id"
                  required
                  type="email"
                  value={settingsForm.contactEmail || ""}
                />
                <small style={{ color: "var(--admin-muted)", fontSize: "12px" }}>
                  Tombol &ldquo;Minta Laporan&rdquo; di halaman publik akan otomatis membuka email klien ke alamat ini.
                </small>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  className="aa-btn aa-btn-primary"
                  disabled={settingsSaving}
                  type="submit"
                >
                  {settingsSaving ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Modal Tambah Laporan */}
      {createModalOpen && (
        <ReportModal
          item={null}
          onClose={() => setCreateModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal Edit Laporan */}
      {editingItem && (
        <ReportModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
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

