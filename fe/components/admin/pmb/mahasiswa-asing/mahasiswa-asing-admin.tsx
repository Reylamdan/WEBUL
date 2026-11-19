"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  foreignStudentAdminApi,
  type AdminForeignStudentRequirement,
  type ForeignStudentRequirementInput,
  type ForeignStudentSettingsInput,
  type PublishStatus,
} from "@/lib/foreign-student-admin-api";

const PAGE_LIMIT = 50;

// ================= Modal Dokumen Persyaratan =================
function RequirementModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminForeignStudentRequirement | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<ForeignStudentRequirementInput>({
    title: item?.title ?? "",
    description: item?.description ?? "",
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Isi dokumen persyaratan wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ForeignStudentRequirementInput = {
        ...form,
        title: form.title?.trim() || null,
        description: form.description.trim(),
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (item) {
        await foreignStudentAdminApi.updateRequirement(item.id, payload);
        onSaved("Dokumen persyaratan berhasil diperbarui.");
      } else {
        await foreignStudentAdminApi.createRequirement(payload);
        onSaved("Dokumen persyaratan baru berhasil ditambahkan.");
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
            {item ? "Edit Dokumen Persyaratan" : "Tambah Dokumen Persyaratan"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}

          <div>
            <label htmlFor={`${uid}-title`}>Label / Judul Singkat (Opsional)</label>
            <input
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder="Contoh: Paspor / KITAS / Letter of Acceptance"
              type="text"
              value={form.title ?? ""}
            />
            <small style={{ color: "#666" }}>
              Digunakan sebagai label pengingat singkat di admin.
            </small>
          </div>

          <div>
            <label htmlFor={`${uid}-desc`}>
              Isi Dokumen Persyaratan <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-desc`}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Tuliskan nama dokumen atau deskripsi persyaratan lengkap..."
              required
              rows={4}
              value={form.description}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-sort`}>Urutan Tampilan</label>
            <input
              id={`${uid}-sort`}
              min={0}
              onChange={(e) => setForm((cur) => ({ ...cur, sortOrder: Number(e.target.value) || 0 }))}
              type="number"
              value={form.sortOrder}
            />
            <small style={{ color: "#666" }}>Nomor urut semakin kecil tampil lebih dulu di daftar.</small>
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
              {saving ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah Dokumen"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama MahasiswaAsingAdmin =================

export function MahasiswaAsingAdmin() {
  const [activeTab, setActiveTab] = useState<"requirements" | "settings">("requirements");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Requirements state
  const [reqSearchInput, setReqSearchInput] = useState("");
  const reqSearch = useDebouncedValue(reqSearchInput, 400);
  const [reqStatus, setReqStatus] = useState<PublishStatus | "">("");
  const [refreshRequirements, setRefreshRequirements] = useState(0);
  const [editingRequirement, setEditingRequirement] = useState<
    AdminForeignStudentRequirement | "new" | null
  >(null);

  // Settings state
  const [refreshSettings, setRefreshSettings] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<ForeignStudentSettingsInput>({
    heroTitle: "Mahasiswa Asing",
    introEyebrow: "PENERIMAAN MAHASISWA",
    introTitle: "Selamat datang di Universitas LIA",
    introDescription:
      "Mahasiswa asing adalah warga negara asing yang akan mengikuti pendidikan pada Universitas LIA.",
    requirementsEyebrow: "PERSIAPAN DOKUMEN",
    requirementsTitle: "Syarat dan Ketentuan",
    requirementsDescription:
      "Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib memenuhi dokumen persyaratan yang digunakan untuk mengurus izin belajar dibawah ini:",
    referenceTitle: "Referensi Dokumen",
    referenceDescription: "Contoh dokumen persyaratan dapat dilihat melalui link:",
    referenceUrl: "https://izinbelajar.kemdiktisaintek.go.id",
    referenceLabel: "izinbelajar.kemdiktisaintek.go.id",
  });

  // Queries
  const requirementsList = useApi(
    `foreign-student-requirements-${reqStatus}-${reqSearch}-${refreshRequirements}`,
    () =>
      foreignStudentAdminApi.listRequirements({
        status: reqStatus,
        search: reqSearch,
        limit: PAGE_LIMIT,
      })
  );

  const settingsData = useApi(`foreign-student-settings-${refreshSettings}`, () =>
    foreignStudentAdminApi.getSettings()
  );

  useEffect(() => {
    if (settingsData.data) {
      setSettingsForm({
        heroTitle: settingsData.data.heroTitle ?? "Mahasiswa Asing",
        introEyebrow: settingsData.data.introEyebrow ?? "PENERIMAAN MAHASISWA",
        introTitle: settingsData.data.introTitle ?? "Selamat datang di Universitas LIA",
        introDescription: settingsData.data.introDescription ?? "",
        requirementsEyebrow: settingsData.data.requirementsEyebrow ?? "PERSIAPAN DOKUMEN",
        requirementsTitle: settingsData.data.requirementsTitle ?? "Syarat dan Ketentuan",
        requirementsDescription: settingsData.data.requirementsDescription ?? "",
        referenceTitle: settingsData.data.referenceTitle ?? "Referensi Dokumen",
        referenceDescription: settingsData.data.referenceDescription ?? "",
        referenceUrl: settingsData.data.referenceUrl ?? "https://izinbelajar.kemdiktisaintek.go.id",
        referenceLabel: settingsData.data.referenceLabel ?? "izinbelajar.kemdiktisaintek.go.id",
      });
    }
  }, [settingsData.data]);

  // Actions
  async function handleDeleteRequirement(item: AdminForeignStudentRequirement) {
    if (!window.confirm("Hapus dokumen persyaratan ini?")) return;
    try {
      setActionError(null);
      await foreignStudentAdminApi.deleteRequirement(item.id);
      setNotice("Dokumen persyaratan berhasil dihapus.");
      setRefreshRequirements((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleRequirementStatus(item: AdminForeignStudentRequirement) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await foreignStudentAdminApi.updateRequirement(item.id, { status: nextStatus });
      setRefreshRequirements((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await foreignStudentAdminApi.updateSettings({
        ...settingsForm,
      });
      setNotice("Pengaturan halaman mahasiswa asing berhasil diperbarui.");
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
          <h1 className="aa-title">Mahasiswa Asing (Syarat & Ketentuan)</h1>
          <p className="aa-subtitle">
            Kelola dokumen persyaratan izin belajar mahasiswa asing, informasi pengantar, dan tautan referensi resmi kementerian.
          </p>
        </div>
        <div>
          {activeTab === "requirements" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingRequirement("new")}
              type="button"
            >
              + Tambah Dokumen Persyaratan
            </button>
          )}
        </div>
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Mahasiswa Asing" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "requirements" ? "is-active" : ""}`}
          onClick={() => setActiveTab("requirements")}
          type="button"
        >
          Dokumen Persyaratan
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Halaman & Referensi
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

      {/* ================= TAB 1: DOKUMEN PERSYARATAN ================= */}
      {activeTab === "requirements" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari dokumen"
              onChange={(e) => setReqSearchInput(e.target.value)}
              placeholder="Cari isi dokumen persyaratan atau label..."
              type="search"
              value={reqSearchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setReqStatus(e.target.value as PublishStatus | "")}
              value={reqStatus}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {requirementsList.error && !requirementsList.data ? (
            <p className="aa-error">{errorMessage(requirementsList.error)}</p>
          ) : requirementsList.loading && !requirementsList.data ? (
            <p className="aa-empty">Memuat daftar dokumen persyaratan...</p>
          ) : (requirementsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada dokumen persyaratan mahasiswa asing.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: "center" }}>No</th>
                    <th style={{ width: 180 }}>Label / Judul</th>
                    <th>Isi Dokumen Persyaratan</th>
                    <th style={{ width: 100, textAlign: "center" }}>Urutan</th>
                    <th style={{ width: 120, textAlign: "center" }}>Status</th>
                    <th style={{ width: 140, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {requirementsList.data?.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "#666" }}>{idx + 1}</td>
                      <td>
                        <strong>{item.title || "—"}</strong>
                      </td>
                      <td style={{ whiteSpace: "pre-line" }}>{item.description}</td>
                      <td style={{ textAlign: "center" }}>{item.sortOrder}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${item.status === "published" ? "aa-badge-success" : "aa-badge-warning"}`}
                          onClick={() => handleToggleRequirementStatus(item)}
                          style={{ cursor: "pointer", border: "none" }}
                          title="Klik untuk mengubah status"
                          type="button"
                        >
                          {item.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-secondary"
                          onClick={() => setEditingRequirement(item)}
                          style={{ marginRight: 6 }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-danger"
                          onClick={() => handleDeleteRequirement(item)}
                          type="button"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN HALAMAN & REFERENSI ================= */}
      {activeTab === "settings" && (
        <form className="aa-form-panel" onSubmit={handleSaveSettings}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>
            1. Header Hero
          </h2>
          <div>
            <label htmlFor="fs-hero-title">Judul Banner Utama (Hero)</label>
            <input
              id="fs-hero-title"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))
              }
              placeholder="Contoh: Mahasiswa Asing"
              required
              type="text"
              value={settingsForm.heroTitle ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            2. Bagian Pengantar (Intro)
          </h2>
          <div>
            <label htmlFor="fs-intro-eyebrow">Eyebrow Pengantar</label>
            <input
              id="fs-intro-eyebrow"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, introEyebrow: e.target.value }))
              }
              placeholder="Contoh: PENERIMAAN MAHASISWA"
              required
              type="text"
              value={settingsForm.introEyebrow ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-intro-title">Judul Pengantar</label>
            <input
              id="fs-intro-title"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, introTitle: e.target.value }))
              }
              placeholder="Contoh: Selamat datang di Universitas LIA"
              required
              type="text"
              value={settingsForm.introTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-intro-desc">Deskripsi Pengantar</label>
            <textarea
              id="fs-intro-desc"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, introDescription: e.target.value }))
              }
              placeholder="Deskripsi penjelasan tentang penerimaan mahasiswa asing..."
              required
              rows={3}
              value={settingsForm.introDescription ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            3. Heading Persyaratan Dokumen
          </h2>
          <div>
            <label htmlFor="fs-req-eyebrow">Eyebrow Persyaratan</label>
            <input
              id="fs-req-eyebrow"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, requirementsEyebrow: e.target.value }))
              }
              placeholder="Contoh: PERSIAPAN DOKUMEN"
              required
              type="text"
              value={settingsForm.requirementsEyebrow ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-req-title">Judul Persyaratan</label>
            <input
              id="fs-req-title"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, requirementsTitle: e.target.value }))
              }
              placeholder="Contoh: Syarat dan Ketentuan"
              required
              type="text"
              value={settingsForm.requirementsTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-req-desc">Deskripsi Persyaratan</label>
            <textarea
              id="fs-req-desc"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, requirementsDescription: e.target.value }))
              }
              placeholder="Penjelasan dokumen persyaratan..."
              required
              rows={3}
              value={settingsForm.requirementsDescription ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            4. Kotak Tautan Referensi Dokumen
          </h2>
          <div>
            <label htmlFor="fs-ref-title">Judul Kotak Referensi</label>
            <input
              id="fs-ref-title"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, referenceTitle: e.target.value }))
              }
              placeholder="Contoh: Referensi Dokumen"
              required
              type="text"
              value={settingsForm.referenceTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-ref-desc">Deskripsi Referensi</label>
            <input
              id="fs-ref-desc"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, referenceDescription: e.target.value }))
              }
              placeholder="Contoh: Contoh dokumen persyaratan dapat dilihat melalui link:"
              required
              type="text"
              value={settingsForm.referenceDescription ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-ref-url">URL / Tautan Referensi</label>
            <input
              id="fs-ref-url"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, referenceUrl: e.target.value }))
              }
              placeholder="Contoh: https://izinbelajar.kemdiktisaintek.go.id"
              required
              type="url"
              value={settingsForm.referenceUrl ?? ""}
            />
          </div>

          <div>
            <label htmlFor="fs-ref-label">Label Tautan yang Ditampilkan</label>
            <input
              id="fs-ref-label"
              onChange={(e) =>
                setSettingsForm((cur) => ({ ...cur, referenceLabel: e.target.value }))
              }
              placeholder="Contoh: izinbelajar.kemdiktisaintek.go.id"
              required
              type="text"
              value={settingsForm.referenceLabel ?? ""}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="aa-btn aa-btn-primary" disabled={savingSettings} type="submit">
              {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      )}

      {/* Modal Tambah / Edit Dokumen Persyaratan */}
      {editingRequirement && (
        <RequirementModal
          item={editingRequirement === "new" ? null : editingRequirement}
          onClose={() => setEditingRequirement(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshRequirements((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

