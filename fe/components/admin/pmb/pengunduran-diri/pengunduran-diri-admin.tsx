"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  resignationAdminApi,
  type AdminResignationTerm,
  type PublishStatus,
  type ResignationSettingsInput,
  type ResignationTermInput,
} from "@/lib/resignation-admin-api";

const PAGE_LIMIT = 20;

// ================= Modal Syarat & Ketentuan =================
function TermModal({
  term,
  onClose,
  onSaved,
}: {
  term: AdminResignationTerm | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<ResignationTermInput>({
    title: term?.title ?? "",
    description: term?.description ?? "",
    refundPercentage: term?.refundPercentage ?? null,
    sortOrder: term?.sortOrder ?? 0,
    status: term?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Isi syarat & ketentuan wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ResignationTermInput = {
        ...form,
        title: form.title?.trim() || null,
        description: form.description.trim(),
        refundPercentage:
          form.refundPercentage !== null && form.refundPercentage !== undefined
            ? Number(form.refundPercentage)
            : null,
      };

      if (term) {
        await resignationAdminApi.updateTerm(term.id, payload);
        onSaved("Syarat & ketentuan berhasil diperbarui.");
      } else {
        await resignationAdminApi.createTerm(payload);
        onSaved("Syarat & ketentuan baru berhasil ditambahkan.");
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
      <div className="aa-modal" style={{ maxWidth: 580 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {term ? "Edit Syarat & Ketentuan" : "Tambah Syarat & Ketentuan"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}

          <div>
            <label htmlFor={`${uid}-title`}>Label / Kategori Alasan (Opsional)</label>
            <input
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder="Contoh: Diterima di PTN / Sakit Keras"
              type="text"
              value={form.title ?? ""}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-desc`}>
              Isi Syarat & Ketentuan <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-desc`}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Tuliskan butir syarat, dokumen yang wajib disertakan, serta konsekuensi pengembalian biaya..."
              required
              rows={4}
              value={form.description}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-refund`}>Persentase Pengembalian Dana (%)</label>
              <input
                id={`${uid}-refund`}
                max={100}
                min={0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((cur) => ({
                    ...cur,
                    refundPercentage: val === "" ? null : parseInt(val, 10),
                  }));
                }}
                placeholder="Contoh: 80 atau 0"
                type="number"
                value={form.refundPercentage ?? ""}
              />
              <span className="aa-help">Kosongkan jika tidak ada persentase khusus.</span>
            </div>

            <div>
              <label htmlFor={`${uid}-sort`}>Urutan Tampilan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                type="number"
                value={form.sortOrder}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-status`}>Status Publikasi</label>
            <select
              id={`${uid}-status`}
              onChange={(e) =>
                setForm((cur) => ({ ...cur, status: e.target.value as PublishStatus }))
              }
              value={form.status}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : term ? "Simpan Perubahan" : "Tambah Ketentuan"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama PengunduranDiriAdmin =================

export function PengunduranDiriAdmin() {
  const [activeTab, setActiveTab] = useState<"terms" | "settings">("terms");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Terms state
  const [termSearchInput, setTermSearchInput] = useState("");
  const termSearch = useDebouncedValue(termSearchInput, 400);
  const [termStatus, setTermStatus] = useState<PublishStatus | "">("");
  const [refreshTerms, setRefreshTerms] = useState(0);
  const [editingTerm, setEditingTerm] = useState<AdminResignationTerm | "new" | null>(null);

  // Settings state
  const [refreshSettings, setRefreshSettings] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<ResignationSettingsInput>({
    heroEyebrow: "INFORMASI PENTING",
    heroTitle: "Pengunduran Diri",
    heroDescription: "",
    sectionTitle: "Syarat dan Ketentuan",
  });

  // Queries
  const termsList = useApi(`resignation-terms-${termStatus}-${termSearch}-${refreshTerms}`, () =>
    resignationAdminApi.listTerms({
      status: termStatus,
      search: termSearch,
      limit: PAGE_LIMIT,
    })
  );

  const settingsData = useApi(`resignation-settings-${refreshSettings}`, () =>
    resignationAdminApi.getSettings()
  );

  useEffect(() => {
    if (settingsData.data) {
      setSettingsForm({
        heroEyebrow: settingsData.data.heroEyebrow,
        heroTitle: settingsData.data.heroTitle,
        heroDescription: settingsData.data.heroDescription || "",
        sectionTitle: settingsData.data.sectionTitle,
      });
    }
  }, [settingsData.data]);

  // Actions
  async function handleDeleteTerm(item: AdminResignationTerm) {
    if (!window.confirm("Hapus butir syarat & ketentuan ini?")) return;
    try {
      setActionError(null);
      await resignationAdminApi.removeTerm(item.id);
      setNotice("Butir syarat & ketentuan berhasil dihapus.");
      setRefreshTerms((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleTermStatus(item: AdminResignationTerm) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await resignationAdminApi.updateTerm(item.id, { status: nextStatus });
      setRefreshTerms((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await resignationAdminApi.updateSettings({
        ...settingsForm,
        heroDescription: settingsForm.heroDescription?.trim() || null,
      });
      setNotice("Pengaturan teks pengunduran diri berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <section className="aa-page pmb-admin-editor">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Pengunduran Diri (Syarat & Ketentuan)</h1>
          <p className="aa-subtitle">
            Kelola butir-butir syarat pengunduran diri, ketentuan pengembalian biaya (refund), serta teks pengantar halaman.
          </p>
        </div>
        <div>
          {activeTab === "terms" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingTerm("new")}
              type="button"
            >
              + Tambah Syarat & Ketentuan
            </button>
          )}
        </div>
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Pengunduran Diri" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "terms" ? "is-active" : ""}`}
          onClick={() => setActiveTab("terms")}
          type="button"
        >
          Syarat & Ketentuan
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Header Halaman
        </button>
      </nav>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} role="status">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="aa-error" role="alert">
          {actionError}
        </p>
      )}

      {/* ================= TAB 1: SYARAT & KETENTUAN ================= */}
      {activeTab === "terms" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari syarat"
              onChange={(e) => setTermSearchInput(e.target.value)}
              placeholder="Cari isi ketentuan atau label..."
              type="search"
              value={termSearchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setTermStatus(e.target.value as PublishStatus | "")}
              value={termStatus}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {termsList.error && !termsList.data ? (
            <p className="aa-error">{errorMessage(termsList.error)}</p>
          ) : termsList.loading && !termsList.data ? (
            <p className="aa-empty">Memuat daftar syarat & ketentuan...</p>
          ) : (termsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada syarat & ketentuan pengunduran diri.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "8%", textAlign: "center" }}>No</th>
                    <th style={{ width: "20%" }}>Label Alasan</th>
                    <th style={{ width: "42%" }}>Isi Syarat & Ketentuan</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Refund</th>
                    <th style={{ width: "8%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(termsList.data?.items || []).map((t, idx) => (
                    <tr key={t.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {String(t.sortOrder || idx + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <strong>{t.title || "-"}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.875rem", color: "#334155" }}>
                          {t.description}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {t.refundPercentage !== null && t.refundPercentage !== undefined ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: t.refundPercentage > 0 ? "#dcfce7" : "#fee2e2",
                              color: t.refundPercentage > 0 ? "#15803d" : "#b91c1c",
                            }}
                          >
                            {t.refundPercentage}%
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${t.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}
                          onClick={() => handleToggleTermStatus(t)}
                          style={{ cursor: "pointer", border: "none" }}
                          type="button"
                        >
                          {t.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingTerm(t)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteTerm(t)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN HEADER ================= */}
      {activeTab === "settings" && (
        <form className="aa-form" onSubmit={handleSaveSettings} style={{ maxWidth: 760 }}>
          <section className="aa-settings-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
              Teks Pengantar Hero
            </h2>

            <div>
              <label htmlFor="settings-hero-eyebrow">Eyebrow Hero</label>
              <input
                id="settings-hero-eyebrow"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroEyebrow: e.target.value }))}
                type="text"
                value={settingsForm.heroEyebrow ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-title">Judul Utama Halaman</label>
              <input
                id="settings-hero-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
                type="text"
                value={settingsForm.heroTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-desc">Deskripsi Hero (Opsional)</label>
              <textarea
                id="settings-hero-desc"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroDescription: e.target.value }))}
                placeholder="Penjelasan singkat jika diperlukan..."
                rows={2}
                value={settingsForm.heroDescription ?? ""}
              />
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Teks Bagian Konten
            </h2>

            <div>
              <label htmlFor="settings-sec-title">Judul Bagian Ketentuan</label>
              <input
                id="settings-sec-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, sectionTitle: e.target.value }))}
                type="text"
                value={settingsForm.sectionTitle ?? ""}
              />
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button className="aa-btn aa-btn-primary" disabled={savingSettings} type="submit">
                {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Modal */}
      {editingTerm && (
        <TermModal
          onClose={() => setEditingTerm(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshTerms((n) => n + 1);
          }}
          term={editingTerm === "new" ? null : editingTerm}
        />
      )}
    </section>
  );
}

