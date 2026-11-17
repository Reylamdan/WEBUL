"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage, type RegistrationActivity } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  registrationPeriodAdminApi,
  type AdminRegistrationWave,
  type RegistrationPeriodSettingsInput,
  type RegistrationWaveInput,
  type WaveStatus,
} from "@/lib/registration-period-admin-api";

const PAGE_LIMIT = 10;

const DEFAULT_ACTIVITIES: RegistrationActivity[] = [
  { name: "Pendaftaran", time: "01 Januari – 31 Maret 2027" },
  { name: "Tes dan Wawancara", time: "05 April 2027" },
  { name: "Daftar Ulang", time: "10 April – 20 April 2027" },
];

const EMPTY_WAVE_FORM: RegistrationWaveInput = {
  name: "",
  label: "",
  activities: [],
  sortOrder: 0,
  status: "published",
};

function toWaveForm(w: AdminRegistrationWave): RegistrationWaveInput {
  return {
    name: w.name,
    label: w.label || "",
    activities: Array.isArray(w.activities) ? [...w.activities] : [],
    sortOrder: w.sortOrder,
    status: w.status,
  };
}

// ================= Modal Gelombang Pendaftaran =================

function WaveModal({
  wave,
  onClose,
  onSaved,
}: {
  wave: AdminRegistrationWave | null;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<RegistrationWaveInput>(
    wave
      ? toWaveForm(wave)
      : {
          ...EMPTY_WAVE_FORM,
          activities: [...DEFAULT_ACTIVITIES],
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RegistrationWaveInput>(
    key: K,
    val: RegistrationWaveInput[K]
  ) => setForm((cur) => ({ ...cur, [key]: val }));

  // Activities helpers
  const handleAddActivity = () => {
    setForm((cur) => ({
      ...cur,
      activities: [...cur.activities, { name: "", time: "" }],
    }));
  };

  const handleUpdateActivity = (index: number, field: keyof RegistrationActivity, val: string) => {
    setForm((cur) => {
      const next = [...cur.activities];
      next[index] = { ...next[index], [field]: val };
      return { ...cur, activities: next };
    });
  };

  const handleRemoveActivity = (index: number) => {
    setForm((cur) => ({
      ...cur,
      activities: cur.activities.filter((_, i) => i !== index),
    }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama gelombang pendaftaran wajib diisi.");
      return;
    }

    // Filter out completely empty activities
    const validActivities = form.activities
      .map((a) => ({ name: a.name.trim(), time: a.time.trim() }))
      .filter((a) => a.name !== "" || a.time !== "");

    for (let i = 0; i < validActivities.length; i++) {
      if (!validActivities[i].name || !validActivities[i].time) {
        setError(`Tahapan ke-${i + 1} harus memiliki nama kegiatan dan waktu pelaksanaan yang lengkap.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload: RegistrationWaveInput = {
        ...form,
        label: form.label?.trim() ? form.label.trim() : null,
        activities: validActivities,
      };

      if (wave) {
        await registrationPeriodAdminApi.updateWave(wave.id, payload);
        onSaved("Gelombang pendaftaran berhasil diperbarui.");
      } else {
        await registrationPeriodAdminApi.createWave(payload);
        onSaved("Gelombang pendaftaran baru berhasil ditambahkan.");
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div
      className="aa-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        aria-labelledby={`${uid}-title`}
        aria-modal="true"
        className="aa-modal"
        onSubmit={submit}
        role="dialog"
        style={{ maxWidth: 680 }}
      >
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {wave ? "Ubah Gelombang Pendaftaran" : "Tambah Gelombang Pendaftaran"}
        </h2>

        <div className="aa-row">
          <label className="aa-field">
            <span>Nama Gelombang *</span>
            <input
              maxLength={150}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Contoh: Gelombang 1, Jalur Prestasi"
              required
              value={form.name}
            />
          </label>

          <label className="aa-field">
            <span>Label / Keterangan Singkat</span>
            <input
              maxLength={150}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Contoh: Pendaftaran awal, Bebas tes"
              value={form.label || ""}
            />
          </label>
        </div>

        {/* Section Tahapan Kegiatan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--admin-ink)" }}>
              Tahapan Kegiatan & Jadwal
            </span>
            <button
              className="aa-btn aa-btn-sm"
              onClick={handleAddActivity}
              type="button"
            >
              + Tambah Tahapan
            </button>
          </div>

          {form.activities.length === 0 ? (
            <p className="aa-empty" style={{ padding: "16px 20px", fontSize: 13 }}>
              Belum ada tahapan kegiatan. Klik <strong>+ Tambah Tahapan</strong> untuk menambahkan alur seleksi.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.activities.map((act, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--admin-border, #e2e8f0)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--admin-muted, #64748b)",
                      minWidth: 24,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <input
                    aria-label={`Nama tahapan ke-${idx + 1}`}
                    maxLength={150}
                    onChange={(e) => handleUpdateActivity(idx, "name", e.target.value)}
                    placeholder="Nama kegiatan (contoh: Pendaftaran)"
                    style={{ flex: 1, padding: "7px 10px", fontSize: 13 }}
                    value={act.name}
                  />
                  <input
                    aria-label={`Waktu tahapan ke-${idx + 1}`}
                    maxLength={200}
                    onChange={(e) => handleUpdateActivity(idx, "time", e.target.value)}
                    placeholder="Waktu pelaksanaan (contoh: 01 Jan – 31 Mar 2027)"
                    style={{ flex: 1.2, padding: "7px 10px", fontSize: 13 }}
                    value={act.time}
                  />
                  <button
                    aria-label={`Hapus tahapan ke-${idx + 1}`}
                    className="aa-btn aa-btn-sm aa-btn-danger"
                    onClick={() => handleRemoveActivity(idx)}
                    style={{ padding: "6px 9px", fontSize: 12 }}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="aa-row">
          <label className="aa-field">
            <span>Urutan Tampil (Sort Order)</span>
            <input
              min={0}
              onChange={(e) => set("sortOrder", parseInt(e.target.value, 10) || 0)}
              type="number"
              value={form.sortOrder}
            />
          </label>

          <label className="aa-field">
            <span>Status *</span>
            <select
              onChange={(e) => set("status", e.target.value as WaveStatus)}
              value={form.status}
            >
              <option value="published">Published (Ditampilkan)</option>
              <option value="draft">Draft (Disembunyikan)</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="aa-error" role="alert">
            {error}
          </p>
        )}

        <div className="aa-modal-actions">
          <button
            className="aa-btn"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
            {saving ? "Menyimpan..." : wave ? "Simpan Perubahan" : "Tambah Gelombang"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================= Komponen Admin Utama =================

export function PeriodePendaftaranAdmin() {
  const [activeTab, setActiveTab] = useState<"waves" | "settings">("waves");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<WaveStatus | "">("");
  const [page, setPage] = useState(1);
  const [refreshWaves, setRefreshWaves] = useState(0);
  const [refreshSettings, setRefreshSettings] = useState(0);

  const [editingWave, setEditingWave] = useState<AdminRegistrationWave | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Load waves list
  const wavesList = useApi(
    `admin-registration-waves:${page}:${status}:${search}:${refreshWaves}`,
    () =>
      registrationPeriodAdminApi.listWaves({
        page,
        limit: PAGE_LIMIT,
        status,
        search,
      })
  );

  // Load settings
  const settingsQuery = useApi(
    `admin-registration-settings:${refreshSettings}`,
    () => registrationPeriodAdminApi.getSettings()
  );

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<RegistrationPeriodSettingsInput>({
    heroEyebrow: "",
    heroTitle: "",
    heroDescription: "",
    sectionEyebrow: "",
    sectionTitle: "",
    sectionDescription: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data;
      setSettingsForm({
        heroEyebrow: s.heroEyebrow ?? "PENERIMAAN MAHASISWA BARU",
        heroTitle: s.heroTitle ?? "Periode Pendaftaran",
        heroDescription:
          s.heroDescription ??
          "Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA. Pilih gelombang untuk melihat jadwal pendaftaran, tes, dan daftar ulang.",
        sectionEyebrow: s.sectionEyebrow ?? "JADWAL PENERIMAAN 2027",
        sectionTitle: s.sectionTitle ?? "Tahapan pendaftaran",
        sectionDescription:
          s.sectionDescription ??
          "Jadwal di bawah merupakan data contoh dan dapat diperbarui.",
      });
    }
  }, [settingsQuery.data]);

  async function toggleStatus(item: AdminRegistrationWave) {
    const next: WaveStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await registrationPeriodAdminApi.updateWave(item.id, { status: next });
      setNotice(
        `Status gelombang "${item.name}" diubah menjadi ${
          next === "published" ? "Published" : "Draft"
        }.`
      );
      setRefreshWaves((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function removeWave(item: AdminRegistrationWave) {
    if (
      !window.confirm(
        `Hapus gelombang "${item.name}" beserta jadwal kegiatannya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    try {
      setActionError(null);
      await registrationPeriodAdminApi.removeWave(item.id);
      setNotice(`Gelombang "${item.name}" berhasil dihapus.`);
      setRefreshWaves((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await registrationPeriodAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan teks periode pendaftaran berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  const waves = wavesList.data?.items ?? [];
  const pagination = wavesList.data?.pagination;

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Periode Pendaftaran PMB</h1>
          <p className="aa-subtitle">
            Kelola gelombang pendaftaran, jadwal tahapan seleksi mahasiswa baru, dan pengaturan teks pengantar halaman.
          </p>
        </div>
        {activeTab === "waves" && (
          <button
            className="aa-btn aa-btn-primary"
            onClick={() => setEditingWave("new")}
            type="button"
          >
            + Tambah Gelombang
          </button>
        )}
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Periode Pendaftaran" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "waves" ? "is-active" : ""}`}
          onClick={() => setActiveTab("waves")}
          type="button"
        >
          Gelombang Pendaftaran (Jadwal)
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Header & Teks Halaman
        </button>
      </nav>

      {notice && (
        <p
          aria-live="polite"
          className="aa-notice"
          onClick={() => setNotice(null)}
          role="status"
        >
          {notice}
        </p>
      )}

      {actionError && (
        <p className="aa-error" role="alert">
          {actionError}
        </p>
      )}

      {/* ================= TAB 1: DAFTAR GELOMBANG PENDAFTARAN (CRUD) ================= */}
      {activeTab === "waves" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari gelombang"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama gelombang atau keterangan..."
              type="search"
              value={searchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setStatus(e.target.value as WaveStatus | "")}
              value={status}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {wavesList.error && !wavesList.data ? (
            <p className="aa-error" role="alert">
              {errorMessage(wavesList.error)}
            </p>
          ) : wavesList.loading && !wavesList.data ? (
            <p className="aa-empty">Memuat daftar gelombang pendaftaran...</p>
          ) : waves.length === 0 ? (
            <p className="aa-empty">
              {search || status
                ? "Tidak ada gelombang yang cocok dengan filter."
                : "Belum ada gelombang pendaftaran. Tambahkan yang pertama!"}
            </p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Gelombang & Keterangan</th>
                    <th>Tahapan Kegiatan</th>
                    <th>Urutan</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {waves.map((item) => (
                    <tr key={item.id}>
                      <td style={{ minWidth: 180 }}>
                        <strong>{item.name}</strong>
                        {item.label && <small>{item.label}</small>}
                      </td>
                      <td style={{ maxWidth: 380 }}>
                        {item.activities && item.activities.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {item.activities.map((act, aIdx) => (
                              <div
                                key={aIdx}
                                style={{
                                  fontSize: 12.5,
                                  lineHeight: 1.4,
                                  color: "var(--admin-ink)",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: "var(--admin-blue, #0284c7)",
                                    marginRight: 6,
                                  }}
                                >
                                  {String(aIdx + 1).padStart(2, "0")}.
                                </span>
                                <strong>{act.name}</strong>:{" "}
                                <span style={{ color: "var(--admin-muted, #64748b)" }}>
                                  {act.time}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                            Belum ada jadwal tahapan
                          </span>
                        )}
                      </td>
                      <td>{item.sortOrder}</td>
                      <td>
                        <span className={`aa-badge aa-badge-${item.status}`}>
                          {item.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="aa-actions">
                        <button
                          className="aa-btn aa-btn-sm"
                          onClick={() => toggleStatus(item)}
                          type="button"
                        >
                          {item.status === "published" ? "Jadikan Draft" : "Publish"}
                        </button>
                        <button
                          className="aa-btn aa-btn-sm"
                          onClick={() => setEditingWave(item)}
                          type="button"
                        >
                          Ubah
                        </button>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-danger"
                          onClick={() => removeWave(item)}
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

          {pagination && pagination.totalPages > 1 && (
            <nav aria-label="Halaman" className="aa-pagination">
              <button
                className="aa-btn aa-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Sebelumnya
              </button>
              <span>
                Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} data
              </span>
              <button
                className="aa-btn aa-btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Selanjutnya
              </button>
            </nav>
          )}

          {editingWave && (
            <WaveModal
              onClose={() => setEditingWave(null)}
              onSaved={(msg) => {
                setEditingWave(null);
                if (msg) setNotice(msg);
                setRefreshWaves((n) => n + 1);
              }}
              wave={editingWave === "new" ? null : editingWave}
            />
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN HEADER & TEKS HALAMAN ================= */}
      {activeTab === "settings" && (
        <form
          onSubmit={handleSaveSettings}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Section 1: Hero */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">1. Bagian Hero Header</h2>

            <label className="aa-field">
              <span>Eyebrow Hero</span>
              <input
                maxLength={100}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, heroEyebrow: e.target.value }))
                }
                placeholder="PENERIMAAN MAHASISWA BARU"
                value={settingsForm.heroEyebrow ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Judul Hero *</span>
              <input
                maxLength={150}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, heroTitle: e.target.value }))
                }
                placeholder="Periode Pendaftaran"
                required
                value={settingsForm.heroTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi Hero</span>
              <textarea
                maxLength={1000}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    heroDescription: e.target.value,
                  }))
                }
                placeholder="Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA..."
                rows={3}
                value={settingsForm.heroDescription ?? ""}
              />
            </label>
          </div>

          {/* Section 2: Heading Tahapan & Catatan */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">2. Bagian Heading Tahapan & Catatan</h2>

            <label className="aa-field">
              <span>Eyebrow Bagian</span>
              <input
                maxLength={100}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, sectionEyebrow: e.target.value }))
                }
                placeholder="JADWAL PENERIMAAN 2027"
                value={settingsForm.sectionEyebrow ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Judul Bagian *</span>
              <input
                maxLength={150}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, sectionTitle: e.target.value }))
                }
                placeholder="Tahapan pendaftaran"
                required
                value={settingsForm.sectionTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi / Catatan Bagian</span>
              <textarea
                maxLength={1000}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    sectionDescription: e.target.value,
                  }))
                }
                placeholder="Jadwal di bawah merupakan data contoh dan dapat diperbarui."
                rows={2}
                value={settingsForm.sectionDescription ?? ""}
              />
            </label>
          </div>

          {/* Tombol Simpan */}
          <div>
            <button
              className="aa-btn aa-btn-primary"
              disabled={savingSettings}
              style={{ minWidth: 200 }}
              type="submit"
            >
              {savingSettings ? "Menyimpan Pengaturan..." : "Simpan Pengaturan Teks"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

