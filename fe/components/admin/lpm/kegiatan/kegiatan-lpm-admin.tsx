"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  lpmActivityAdminApi,
  type AdminActivityItem,
  type PublishStatus,
} from "@/lib/lpm-activity-admin-api";

const PAGE_SIZE = 10;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--admin-line)",
};

function formatDateIndo(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function isValidLink(value: string): boolean {
  if (!value) return true;
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// ================= Modal Tambah / Edit =================
function ActivityModal({
  item,
  nextOrder,
  onClose,
  onSaved,
}: {
  item: AdminActivityItem | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [activityDate, setActivityDate] = useState(item?.activityDate ?? "");
  const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? "");
  const [sortOrder, setSortOrder] = useState<number>(item?.sortOrder ?? nextOrder);
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "published");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Judul kegiatan wajib diisi.");
    if (!isValidLink(linkUrl.trim())) {
      return setError("Tautan harus berupa path internal (contoh: /lpm/kegiatan-lpm/benchmarking) atau URL https.");
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
      return setError("Urutan harus berupa angka bulat 0 - 9999.");
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      activityDate: activityDate || null,
      linkUrl: linkUrl.trim() || null,
      sortOrder,
      status,
    };

    try {
      if (item) {
        await lpmActivityAdminApi.update(item.id, payload);
        onSaved("Kegiatan LPM berhasil diperbarui.");
      } else {
        await lpmActivityAdminApi.create(payload);
        onSaved("Kegiatan LPM baru berhasil ditambahkan.");
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
          <h2 className="aa-modal-title">{item ? "Edit Kegiatan LPM" : "Tambah Kegiatan LPM"}</h2>
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
              placeholder="Contoh: Sosialisasi Standar Mutu & SOP"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="aa-field">
            <span>Deskripsi</span>
            <textarea
              id={`${uid}-desc`}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan singkat kegiatan..."
              rows={3}
              value={description}
            />
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <span>Tanggal Kegiatan (Opsional)</span>
              <input id={`${uid}-date`} onChange={(e) => setActivityDate(e.target.value)} type="date" value={activityDate} />
              <small style={{ color: "var(--admin-muted)" }}>Tampil di kartu, contoh: 8 MEI 2024.</small>
            </div>
            <div className="aa-field" style={{ maxWidth: 150 }}>
              <span>Urutan Tampil</span>
              <input
                id={`${uid}-order`}
                max={9999}
                min={0}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                type="number"
                value={sortOrder}
              />
              <small style={{ color: "var(--admin-muted)" }}>Kecil tampil lebih dulu.</small>
            </div>
          </div>

          <div className="aa-field">
            <span>Tautan Kartu (Opsional)</span>
            <input
              id={`${uid}-link`}
              maxLength={500}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/lpm/kegiatan-lpm/benchmarking atau https://..."
              type="text"
              value={linkUrl}
            />
            <small style={{ color: "var(--admin-muted)" }}>
              Jika diisi, kartu bisa diklik dan menampilkan panah →. Kosongkan jika tidak perlu.
            </small>
          </div>

          <div className="aa-field">
            <span>Status</span>
            <div style={{ display: "flex", gap: 20, marginTop: 4, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input checked={status === "published"} name={`${uid}-status`} onChange={() => setStatus("published")} type="radio" />
                <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (tampil di website)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input checked={status === "draft"} name={`${uid}-status`} onChange={() => setStatus("draft")} type="radio" />
                <span>Draf (hanya admin)</span>
              </label>
            </div>
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 12 }}>
            <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : item ? "Simpan Perubahan" : "Simpan"}
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
  item: AdminActivityItem;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await lpmActivityAdminApi.remove(item.id);
      onDeleted(`Kegiatan "${item.title}" berhasil dihapus.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 440 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          Hapus Kegiatan LPM?
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 8px", fontSize: 14, lineHeight: 1.5 }}>
          Anda yakin ingin menghapus <strong>&ldquo;{item.title}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
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
export function KegiatanLpmAdmin() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminActivityItem | null>(null);
  const [deleting, setDeleting] = useState<AdminActivityItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    lpmActivityAdminApi
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

  async function toggleStatus(item: AdminActivityItem) {
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await lpmActivityAdminApi.update(item.id, { status: next });
      setNotice(next === "published" ? `"${item.title}" telah dipublikasikan.` : `"${item.title}" diubah ke Draf.`);
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
  const nextOrder = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 1;

  return (
    <div className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Kegiatan LPM</h1>
          <p className="aa-subtitle">
            Kelola daftar kegiatan penjaminan mutu yang tampil di halaman Kegiatan LPM.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            className="aa-btn"
            href="/lpm/kegiatan-lpm"
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
            <span>Tambah Kegiatan</span>
          </button>
        </div>
      </header>

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
            placeholder="Cari judul atau deskripsi kegiatan..."
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
          Menampilkan <strong>{firstItem}</strong>–<strong>{lastItem}</strong> dari <strong>{total}</strong> kegiatan
          {hasFilters ? " (filter aktif)" : ""}
        </div>
      </section>

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 70, textAlign: "center" }}>Urutan</th>
              <th style={{ minWidth: 280 }}>Kegiatan</th>
              <th style={{ width: 160 }}>Tanggal</th>
              <th style={{ width: 200 }}>Tautan</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat data kegiatan LPM...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada kegiatan LPM.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>
                      {hasFilters ? "Coba ubah kata kunci atau bersihkan filter." : "Belum ada kegiatan. Tambahkan kegiatan pertama."}
                    </p>
                    {hasFilters ? (
                      <button className="aa-btn aa-btn-sm" onClick={resetFilters} type="button">
                        Bersihkan Filter
                      </button>
                    ) : (
                      <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreating(true)} type="button">
                        + Tambah Kegiatan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center", color: "var(--admin-muted)", fontWeight: 700 }}>{item.sortOrder}</td>
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
                  <td style={{ fontSize: 13 }}>{formatDateIndo(item.activityDate)}</td>
                  <td style={{ fontSize: 12 }}>
                    {item.linkUrl ? (
                      <code style={{ wordBreak: "break-all" }}>{item.linkUrl}</code>
                    ) : (
                      <span style={{ color: "var(--admin-muted)" }}>—</span>
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
              ))
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

      {creating && <ActivityModal item={null} nextOrder={nextOrder} onClose={() => setCreating(false)} onSaved={handleSaved} />}
      {editing && <ActivityModal item={editing} nextOrder={nextOrder} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {deleting && <DeleteConfirmModal item={deleting} onClose={() => setDeleting(null)} onDeleted={handleSaved} />}
    </div>
  );
}
