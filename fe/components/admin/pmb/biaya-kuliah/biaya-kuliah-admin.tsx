"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage, type TuitionFeeItem } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  tuitionFeeAdminApi,
  type AdminTuitionWave,
  type TuitionSettingsInput,
  type TuitionWaveInput,
  type WaveStatus,
} from "@/lib/tuition-fee-admin-api";

const PAGE_LIMIT = 10;

const DEFAULT_STUDY_PROGRAMS = [
  "Bahasa Jepang",
  "Bahasa Inggris",
  "Desain Komunikasi Visual",
  "Sistem Informasi",
  "Informatika",
  "Bisnis Digital",
  "D3 Bahasa Inggris",
];

const DEFAULT_FEES: TuitionFeeItem[] = [
  { program: "Bahasa Jepang", amount: 5250000 },
  { program: "Bahasa Inggris", amount: 5250000 },
  { program: "Desain Komunikasi Visual", amount: 5000000 },
  { program: "Sistem Informasi", amount: 5000000 },
  { program: "Informatika", amount: 5000000 },
  { program: "Bisnis Digital", amount: 5000000 },
  { program: "D3 Bahasa Inggris", amount: 4500000 },
];

const EMPTY_WAVE_FORM: TuitionWaveInput = {
  name: "",
  period: "",
  fees: [],
  sortOrder: 0,
  status: "published",
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function toWaveForm(w: AdminTuitionWave): TuitionWaveInput {
  return {
    name: w.name,
    period: w.period,
    fees: Array.isArray(w.fees) ? w.fees.map((f) => ({ program: f.program, amount: f.amount })) : [],
    sortOrder: w.sortOrder,
    status: w.status,
  };
}

// ================= Modal Gelombang Biaya Kuliah =================

function WaveModal({
  wave,
  defaultPrograms,
  onClose,
  onSaved,
}: {
  wave: AdminTuitionWave | null;
  defaultPrograms: string[];
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<TuitionWaveInput>(
    wave
      ? toWaveForm(wave)
      : {
          ...EMPTY_WAVE_FORM,
          fees: (defaultPrograms.length > 0 ? defaultPrograms : DEFAULT_STUDY_PROGRAMS).map((prog) => {
            const found = DEFAULT_FEES.find((f) => f.program.toLowerCase() === prog.toLowerCase());
            return {
              program: prog,
              amount: found ? found.amount : 5000000,
            };
          }),
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TuitionWaveInput>(
    key: K,
    val: TuitionWaveInput[K]
  ) => setForm((cur) => ({ ...cur, [key]: val }));

  // Fees helpers
  const handleAddFeeRow = () => {
    setForm((cur) => ({
      ...cur,
      fees: [...cur.fees, { program: "", amount: 0 }],
    }));
  };

  const handleUpdateFee = (index: number, field: keyof TuitionFeeItem, val: string | number) => {
    setForm((cur) => {
      const next = [...cur.fees];
      next[index] = { ...next[index], [field]: val };
      return { ...cur, fees: next };
    });
  };

  const handleRemoveFeeRow = (index: number) => {
    setForm((cur) => ({
      ...cur,
      fees: cur.fees.filter((_, i) => i !== index),
    }));
  };

  const handleApplyDefaultPrograms = () => {
    const list = defaultPrograms.length > 0 ? defaultPrograms : DEFAULT_STUDY_PROGRAMS;
    setForm((cur) => {
      const newFees = list.map((prog) => {
        const existing = cur.fees.find((f) => f.program.toLowerCase() === prog.toLowerCase());
        const defaultMatch = DEFAULT_FEES.find((f) => f.program.toLowerCase() === prog.toLowerCase());
        return {
          program: prog,
          amount: existing ? existing.amount : defaultMatch ? defaultMatch.amount : 5000000,
        };
      });
      return { ...cur, fees: newFees };
    });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama gelombang wajib diisi.");
      return;
    }
    if (!form.period.trim()) {
      setError("Periode tanggal gelombang wajib diisi.");
      return;
    }

    const validFees = form.fees
      .map((f) => ({ program: f.program.trim(), amount: Number(f.amount) || 0 }))
      .filter((f) => f.program !== "");

    if (validFees.length === 0) {
      setError("Rincian UKT minimal harus memiliki satu program studi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: TuitionWaveInput = {
        ...form,
        name: form.name.trim(),
        period: form.period.trim(),
        fees: validFees,
      };

      if (wave) {
        await tuitionFeeAdminApi.updateWave(wave.id, payload);
        onSaved(`Gelombang "${form.name}" berhasil diperbarui.`);
      } else {
        await tuitionFeeAdminApi.createWave(payload);
        onSaved(`Gelombang "${form.name}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      aria-labelledby={`${uid}-title`}
      aria-modal="true"
      className="aa-modal-backdrop"
      role="dialog"
    >
      <div className="aa-modal aa-modal-large" style={{ maxWidth: 760 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title" id={`${uid}-title`}>
            {wave ? "Edit Gelombang Biaya Kuliah" : "Tambah Gelombang Biaya Kuliah"}
          </h2>
          <button
            aria-label="Tutup modal"
            className="aa-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && (
            <p className="aa-error" role="alert">
              {error}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-name`}>
                Nama Gelombang <span className="aa-required">*</span>
              </label>
              <input
                id={`${uid}-name`}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contoh: Gelombang 1"
                required
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label htmlFor={`${uid}-period`}>
                Periode Tanggal <span className="aa-required">*</span>
              </label>
              <input
                id={`${uid}-period`}
                onChange={(e) => set("period", e.target.value)}
                placeholder="Contoh: 01 Januari – 31 Maret 2026"
                required
                type="text"
                value={form.period}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan Tampilan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) => set("sortOrder", parseInt(e.target.value, 10) || 0)}
                type="number"
                value={form.sortOrder}
              />
              <span className="aa-help">Angka lebih kecil tampil lebih awal (contoh: 1, 2, 3).</span>
            </div>

            <div>
              <label htmlFor={`${uid}-status`}>Status Publikasi</label>
              <select
                id={`${uid}-status`}
                onChange={(e) => set("status", e.target.value as WaveStatus)}
                value={form.status}
              >
                <option value="published">Published (Tampil di Publik)</option>
                <option value="draft">Draft (Disembunyikan)</option>
              </select>
            </div>
          </div>

          {/* Rincian UKT per Program Studi */}
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem" }}>Rincian UKT per Program Studi</strong>
                <p className="aa-help" style={{ margin: 0 }}>
                  Tentukan besaran UKT per program studi untuk gelombang ini.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="aa-btn aa-btn-secondary"
                  onClick={handleApplyDefaultPrograms}
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                  title="Sesuaikan baris dengan daftar program studi standar"
                  type="button"
                >
                  Muat Prodi Standar
                </button>
                <button
                  className="aa-btn aa-btn-secondary"
                  onClick={handleAddFeeRow}
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                  type="button"
                >
                  + Tambah Baris
                </button>
              </div>
            </div>

            <div className="aa-table-wrap" style={{ maxHeight: "320px", overflowY: "auto" }}>
              <table className="aa-table" style={{ fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Program Studi</th>
                    <th style={{ width: "40%" }}>Nominal UKT (Rp)</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {form.fees.map((fee, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          onChange={(e) => handleUpdateFee(idx, "program", e.target.value)}
                          placeholder="Nama Program Studi"
                          required
                          style={{ width: "100%", padding: "0.35rem 0.5rem" }}
                          type="text"
                          value={fee.program}
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <input
                            min={0}
                            onChange={(e) =>
                              handleUpdateFee(idx, "amount", Math.max(0, parseInt(e.target.value, 10) || 0))
                            }
                            placeholder="5000000"
                            required
                            style={{ width: "100%", padding: "0.35rem 0.5rem" }}
                            type="number"
                            value={fee.amount}
                          />
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {currencyFormatter.format(fee.amount || 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          aria-label={`Hapus program studi ${fee.program || idx + 1}`}
                          className="aa-btn aa-btn-danger"
                          onClick={() => handleRemoveFeeRow(idx)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          type="button"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {form.fees.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>
                        Belum ada rincian UKT. Klik tombol <strong>&ldquo;Muat Prodi Standar&rdquo;</strong> atau <strong>&ldquo;+ Tambah Baris&rdquo;</strong> di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <footer className="aa-modal-footer">
            <button
              className="aa-btn aa-btn-secondary"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Batal
            </button>
            <button
              className="aa-btn aa-btn-primary"
              disabled={saving}
              type="submit"
            >
              {saving ? "Menyimpan..." : wave ? "Simpan Perubahan" : "Tambah Gelombang"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama Biaya Kuliah Admin =================

export function BiayaKuliahAdmin() {
  const [activeTab, setActiveTab] = useState<"waves" | "settings">("waves");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 400);
  const [status, setStatus] = useState<WaveStatus | "">("");
  const [page, setPage] = useState(1);

  const [refreshWaves, setRefreshWaves] = useState(0);
  const [refreshSettings, setRefreshSettings] = useState(0);

  const [editingWave, setEditingWave] = useState<AdminTuitionWave | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState<TuitionSettingsInput>({
    heroEyebrow: "PENERIMAAN MAHASISWA BARU",
    heroTitle: "Biaya Kuliah",
    heroDescription:
      "Temukan informasi biaya kuliah Universitas LIA berdasarkan program studi dan gelombang pendaftaran. Pilih gelombang untuk melihat rincian biaya pendidikan.",
    sectionEyebrow: "RINCIAN BIAYA",
    sectionTitle: "UKT setiap Gelombang",
    studyPrograms: [...DEFAULT_STUDY_PROGRAMS],
  });
  const [newProgramInput, setNewProgramInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch Waves
  const wavesList = useApi(
    `tuition-waves-${page}-${status}-${search}-${refreshWaves}`,
    () =>
      tuitionFeeAdminApi.listWaves({
        page,
        limit: PAGE_LIMIT,
        status,
        search,
      })
  );

  // Fetch Settings
  const settingsData = useApi(
    `tuition-settings-${refreshSettings}`,
    () => tuitionFeeAdminApi.getSettings()
  );

  useEffect(() => {
    if (settingsData.data) {
      setSettingsForm({
        heroEyebrow: settingsData.data.heroEyebrow,
        heroTitle: settingsData.data.heroTitle,
        heroDescription: settingsData.data.heroDescription,
        sectionEyebrow: settingsData.data.sectionEyebrow,
        sectionTitle: settingsData.data.sectionTitle,
        studyPrograms: settingsData.data.studyPrograms || [...DEFAULT_STUDY_PROGRAMS],
      });
    }
  }, [settingsData.data]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  async function handleToggleStatus(item: AdminTuitionWave) {
    const nextStatus: WaveStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await tuitionFeeAdminApi.updateWave(item.id, { status: nextStatus });
      setNotice(
        `Status gelombang "${item.name}" diubah menjadi ${nextStatus === "published" ? "Published" : "Draft"}.`
      );
      setRefreshWaves((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeleteWave(item: AdminTuitionWave) {
    if (
      !window.confirm(
        `Hapus gelombang "${item.name}" beserta rincian UKT-nya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    try {
      setActionError(null);
      await tuitionFeeAdminApi.removeWave(item.id);
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
      await tuitionFeeAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan teks & program studi biaya kuliah berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  const handleAddProgram = () => {
    const trimmed = newProgramInput.trim();
    if (!trimmed) return;
    const current = settingsForm.studyPrograms || [];
    if (current.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setActionError(`Program studi "${trimmed}" sudah ada di daftar.`);
      return;
    }
    setSettingsForm((cur) => ({
      ...cur,
      studyPrograms: [...(cur.studyPrograms || []), trimmed],
    }));
    setNewProgramInput("");
    setActionError(null);
  };

  const handleRemoveProgram = (programToRemove: string) => {
    setSettingsForm((cur) => ({
      ...cur,
      studyPrograms: (cur.studyPrograms || []).filter((p) => p !== programToRemove),
    }));
  };

  const waves = wavesList.data?.items ?? [];
  const pagination = wavesList.data?.pagination;
  const defaultPrograms = settingsForm.studyPrograms || DEFAULT_STUDY_PROGRAMS;

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Biaya Kuliah (UKT)</h1>
          <p className="aa-subtitle">
            Kelola gelombang biaya pendidikan, rincian nominal UKT per program studi, serta pengaturan teks pengantar halaman publik.
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
      <nav aria-label="Tab Menu Biaya Kuliah" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "waves" ? "is-active" : ""}`}
          onClick={() => setActiveTab("waves")}
          type="button"
        >
          Gelombang Biaya (UKT)
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Header & Program Studi
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

      {/* ================= TAB 1: DAFTAR GELOMBANG BIAYA (CRUD) ================= */}
      {activeTab === "waves" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari gelombang"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama gelombang atau periode..."
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
            <p className="aa-empty">Memuat daftar gelombang biaya kuliah...</p>
          ) : waves.length === 0 ? (
            <p className="aa-empty">
              {search || status
                ? "Tidak ada gelombang yang cocok dengan filter."
                : "Belum ada gelombang biaya kuliah. Tambahkan yang pertama!"}
            </p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "20%" }}>Gelombang</th>
                    <th scope="col" style={{ width: "25%" }}>Periode Tanggal</th>
                    <th scope="col" style={{ width: "25%" }}>Rincian UKT</th>
                    <th scope="col" style={{ width: "8%", textAlign: "center" }}>Urutan</th>
                    <th scope="col" style={{ width: "10%", textAlign: "center" }}>Status</th>
                    <th scope="col" style={{ width: "12%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {waves.map((item) => {
                    const feesCount = item.fees?.length || 0;
                    const amounts = (item.fees || []).map((f) => f.amount);
                    const minAmount = amounts.length ? Math.min(...amounts) : 0;
                    const maxAmount = amounts.length ? Math.max(...amounts) : 0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <span>{item.period}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 600 }}>{feesCount} Program Studi</span>
                            {feesCount > 0 && (
                              <div style={{ color: "#64748b", marginTop: "2px" }}>
                                {minAmount === maxAmount
                                  ? currencyFormatter.format(minAmount)
                                  : `${currencyFormatter.format(minAmount)} – ${currencyFormatter.format(maxAmount)}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>{item.sortOrder}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className={`aa-badge ${item.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}
                            onClick={() => handleToggleStatus(item)}
                            style={{ cursor: "pointer", border: "none" }}
                            title="Klik untuk beralih status Draft / Published"
                            type="button"
                          >
                            {item.status === "published" ? "Published" : "Draft"}
                          </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                            <button
                              aria-label={`Edit ${item.name}`}
                              className="aa-btn aa-btn-secondary"
                              onClick={() => setEditingWave(item)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              aria-label={`Hapus ${item.name}`}
                              className="aa-btn aa-btn-danger"
                              onClick={() => handleDeleteWave(item)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                              type="button"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <footer className="aa-pagination">
              <button
                className="aa-btn aa-btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Sebelumnya
              </button>
              <span className="aa-page-info">
                Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                className="aa-btn aa-btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                Selanjutnya
              </button>
            </footer>
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN HEADER & PROGRAM STUDI ================= */}
      {activeTab === "settings" && (
        <form className="aa-form" onSubmit={handleSaveSettings} style={{ maxWidth: 760 }}>
          <section className="aa-settings-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
              Teks Pengantar Hero (Header)
            </h2>

            <div>
              <label htmlFor="settings-hero-eyebrow">Eyebrow Hero</label>
              <input
                id="settings-hero-eyebrow"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroEyebrow: e.target.value }))}
                placeholder="PENERIMAAN MAHASISWA BARU"
                type="text"
                value={settingsForm.heroEyebrow ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-title">Judul Utama Halaman</label>
              <input
                id="settings-hero-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
                placeholder="Biaya Kuliah"
                type="text"
                value={settingsForm.heroTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-desc">Deskripsi Hero</label>
              <textarea
                id="settings-hero-desc"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroDescription: e.target.value }))}
                placeholder="Penjelasan singkat mengenai biaya kuliah..."
                rows={3}
                value={settingsForm.heroDescription ?? ""}
              />
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Teks Bagian Tabel Biaya (Section Heading)
            </h2>

            <div>
              <label htmlFor="settings-sec-eyebrow">Eyebrow Bagian Tabel</label>
              <input
                id="settings-sec-eyebrow"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, sectionEyebrow: e.target.value }))}
                placeholder="RINCIAN BIAYA"
                type="text"
                value={settingsForm.sectionEyebrow ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-sec-title">Judul Bagian Tabel</label>
              <input
                id="settings-sec-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, sectionTitle: e.target.value }))}
                placeholder="UKT setiap Gelombang"
                type="text"
                value={settingsForm.sectionTitle ?? ""}
              />
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Daftar Program Studi Standar
            </h2>
            <p className="aa-help" style={{ marginTop: "-0.5rem" }}>
              Daftar program studi di bawah digunakan sebagai template standar saat membuat gelombang baru.
            </p>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                onChange={(e) => setNewProgramInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddProgram();
                  }
                }}
                placeholder="Tambah program studi baru..."
                style={{ flex: 1 }}
                type="text"
                value={newProgramInput}
              />
              <button
                className="aa-btn aa-btn-secondary"
                onClick={handleAddProgram}
                type="button"
              >
                + Tambah
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              {(settingsForm.studyPrograms || []).map((prog) => (
                <span
                  key={prog}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                  }}
                >
                  {prog}
                  <button
                    aria-label={`Hapus program ${prog}`}
                    onClick={() => handleRemoveProgram(prog)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontWeight: "bold",
                      padding: 0,
                    }}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button
                className="aa-btn aa-btn-primary"
                disabled={savingSettings}
                type="submit"
              >
                {savingSettings ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Modal Tambah / Edit Gelombang */}
      {editingWave && (
        <WaveModal
          defaultPrograms={defaultPrograms}
          onClose={() => setEditingWave(null)}
          onSaved={(msg) => {
            if (msg) setNotice(msg);
            setRefreshWaves((n) => n + 1);
          }}
          wave={editingWave === "new" ? null : editingWave}
        />
      )}
    </section>
  );
}

