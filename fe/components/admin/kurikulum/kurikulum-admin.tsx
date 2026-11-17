"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  curriculumAdminApi,
  type AdminCurriculumProgram,
  type CurriculumProgramInput,
  type CurriculumSettingsInput,
  type ProgramStatus,
} from "@/lib/curriculum-admin-api";

const PAGE_LIMIT = 10;

const EMPTY_PROGRAM_FORM: CurriculumProgramInput = {
  name: "",
  href: "",
  focus: "",
  components: "",
  sortOrder: 0,
  status: "published",
};

function toProgramForm(p: AdminCurriculumProgram): CurriculumProgramInput {
  return {
    name: p.name,
    href: p.href,
    focus: p.focus,
    components: p.components,
    sortOrder: p.sortOrder,
    status: p.status,
  };
}

// ================= Modal Program Studi Kurikulum =================

function ProgramModal({
  program,
  onClose,
  onSaved,
}: {
  program: AdminCurriculumProgram | null;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<CurriculumProgramInput>(
    program ? toProgramForm(program) : { ...EMPTY_PROGRAM_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CurriculumProgramInput>(
    key: K,
    val: CurriculumProgramInput[K]
  ) => setForm((cur) => ({ ...cur, [key]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.href.trim()) {
      setError("Nama program studi dan tautan URL wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (program) {
        await curriculumAdminApi.updateProgram(program.id, form);
        onSaved("Program studi kurikulum berhasil diperbarui.");
      } else {
        await curriculumAdminApi.createProgram(form);
        onSaved("Program studi kurikulum baru berhasil ditambahkan.");
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
      >
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {program ? "Ubah Program Studi Kurikulum" : "Tambah Program Studi Kurikulum"}
        </h2>

        <label className="aa-field">
          <span>Nama Program Studi *</span>
          <input
            maxLength={150}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Contoh: S1 Sistem Informasi"
            required
            value={form.name}
          />
        </label>

        <label className="aa-field">
          <span>Tautan / URL Rincian *</span>
          <input
            maxLength={255}
            onChange={(e) => set("href", e.target.value)}
            placeholder="Contoh: /akademik/fakultas/stmik/sistem-informasi"
            required
            value={form.href}
          />
        </label>

        <label className="aa-field">
          <span>Fokus Pembelajaran *</span>
          <textarea
            maxLength={500}
            onChange={(e) => set("focus", e.target.value)}
            placeholder="Contoh: Sistem enterprise, analisis data, integrasi bisnis-TI"
            required
            rows={2}
            value={form.focus}
          />
        </label>

        <label className="aa-field">
          <span>Komponen Kurikulum *</span>
          <textarea
            maxLength={800}
            onChange={(e) => set("components", e.target.value)}
            placeholder="Contoh: TI inti, arsitektur enterprise, manajemen proyek, magang industri, capstone project"
            required
            rows={3}
            value={form.components}
          />
        </label>

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
              onChange={(e) => set("status", e.target.value as ProgramStatus)}
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
            {saving ? "Menyimpan..." : program ? "Simpan Perubahan" : "Tambah Kurikulum"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================= Komponen Admin Utama =================

export function KurikulumAdmin() {
  const [activeTab, setActiveTab] = useState<"programs" | "settings">("programs");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<ProgramStatus | "">("");
  const [page, setPage] = useState(1);
  const [refreshPrograms, setRefreshPrograms] = useState(0);
  const [refreshSettings, setRefreshSettings] = useState(0);

  const [editingProgram, setEditingProgram] = useState<
    AdminCurriculumProgram | "new" | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Load programs list
  const programsList = useApi(
    `admin-curriculum-programs:${page}:${status}:${search}:${refreshPrograms}`,
    () =>
      curriculumAdminApi.listPrograms({
        page,
        limit: PAGE_LIMIT,
        status,
        search,
      })
  );

  // Load settings
  const settingsQuery = useApi(
    `admin-curriculum-settings:${refreshSettings}`,
    () => curriculumAdminApi.getSettings()
  );

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<CurriculumSettingsInput>({
    heroEyebrow: "",
    heroTitle: "",
    heroDescription: "",
    obeTitle: "",
    obeLead: "",
    obeDescription: "",
    tableEyebrow: "",
    tableTitle: "",
    tableIntro: "",
    tableNote: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data;
      setSettingsForm({
        heroEyebrow: s.heroEyebrow ?? "AKADEMIK UNIVERSITAS LIA",
        heroTitle: s.heroTitle ?? "Kurikulum",
        heroDescription:
          s.heroDescription ??
          "Informasi tentang pendekatan, struktur, dan arah pembelajaran di Universitas LIA. Rincian kurikulum mengikuti program studi dan dokumen akademik resmi.",
        obeTitle: s.obeTitle ?? "Outcome-Based Education (OBE)",
        obeLead:
          s.obeLead ??
          "Capaian pembelajaran sebagai arah perancangan mata kuliah.",
        obeDescription:
          s.obeDescription ??
          "Kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang dibutuhkan lulusan.",
        tableEyebrow: s.tableEyebrow ?? "STRUKTUR KURIKULUM",
        tableTitle: s.tableTitle ?? "Komponen pembelajaran program studi",
        tableIntro:
          s.tableIntro ??
          "Gambaran umum fokus pembelajaran setiap program studi. Untuk rincian mata kuliah, rujuk dokumen kurikulum resmi program studi.",
        tableNote:
          s.tableNote ??
          "Catatan: rincian mata kuliah dapat berbeda menurut program studi dan periode kurikulum.",
      });
    }
  }, [settingsQuery.data]);

  async function toggleStatus(item: AdminCurriculumProgram) {
    const next: ProgramStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await curriculumAdminApi.updateProgram(item.id, { status: next });
      setNotice(
        `Status program studi "${item.name}" diubah menjadi ${
          next === "published" ? "Published" : "Draft"
        }.`
      );
      setRefreshPrograms((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function removeProgram(item: AdminCurriculumProgram) {
    if (
      !window.confirm(
        `Hapus program studi "${item.name}" dari kurikulum? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    try {
      setActionError(null);
      await curriculumAdminApi.removeProgram(item.id);
      setNotice(`Program studi "${item.name}" berhasil dihapus.`);
      setRefreshPrograms((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await curriculumAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan teks kurikulum & konsep OBE berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  const programs = programsList.data?.items ?? [];
  const pagination = programsList.data?.pagination;

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Kurikulum & Program Studi</h1>
          <p className="aa-subtitle">
            Kelola komponen struktur kurikulum program studi (Outcome-Based Education) dan pengaturan teks pengantar halaman.
          </p>
        </div>
        {activeTab === "programs" && (
          <button
            className="aa-btn aa-btn-primary"
            onClick={() => setEditingProgram("new")}
            type="button"
          >
            + Tambah Kurikulum Prodi
          </button>
        )}
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Kurikulum" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "programs" ? "is-active" : ""}`}
          onClick={() => setActiveTab("programs")}
          type="button"
        >
          Komponen Kurikulum Prodi
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengantar & Konsep OBE
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

      {/* ================= TAB 1: DAFTAR PROGRAM STUDI KURIKULUM (CRUD) ================= */}
      {activeTab === "programs" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari kurikulum prodi"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari prodi, fokus, atau komponen..."
              type="search"
              value={searchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setStatus(e.target.value as ProgramStatus | "")}
              value={status}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {programsList.error && !programsList.data ? (
            <p className="aa-error" role="alert">
              {errorMessage(programsList.error)}
            </p>
          ) : programsList.loading && !programsList.data ? (
            <p className="aa-empty">Memuat daftar kurikulum program studi...</p>
          ) : programs.length === 0 ? (
            <p className="aa-empty">
              {search || status
                ? "Tidak ada program studi yang cocok dengan filter."
                : "Belum ada program studi kurikulum. Tambahkan yang pertama!"}
            </p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Program Studi</th>
                    <th>Fokus Pembelajaran</th>
                    <th>Komponen Kurikulum</th>
                    <th>Urutan</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.href}</small>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: 13 }}>{item.focus}</span>
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <span style={{ fontSize: 13, color: "var(--admin-ink-muted, #475569)" }}>
                          {item.components}
                        </span>
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
                          onClick={() => setEditingProgram(item)}
                          type="button"
                        >
                          Ubah
                        </button>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-danger"
                          onClick={() => removeProgram(item)}
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

          {editingProgram && (
            <ProgramModal
              onClose={() => setEditingProgram(null)}
              onSaved={(msg) => {
                setEditingProgram(null);
                if (msg) setNotice(msg);
                setRefreshPrograms((n) => n + 1);
              }}
              program={editingProgram === "new" ? null : editingProgram}
            />
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN TEKS & KONSEP OBE ================= */}
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
                placeholder="AKADEMIK UNIVERSITAS LIA"
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
                placeholder="Kurikulum"
                required
                value={settingsForm.heroTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi Hero</span>
              <textarea
                maxLength={500}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    heroDescription: e.target.value,
                  }))
                }
                placeholder="Informasi tentang pendekatan, struktur, dan arah pembelajaran di Universitas LIA..."
                rows={3}
                value={settingsForm.heroDescription ?? ""}
              />
            </label>
          </div>

          {/* Section 2: Konsep OBE */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">2. Konsep Outcome-Based Education (OBE)</h2>

            <label className="aa-field">
              <span>Judul Bagian OBE *</span>
              <input
                maxLength={150}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, obeTitle: e.target.value }))
                }
                placeholder="Outcome-Based Education (OBE)"
                required
                value={settingsForm.obeTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Subjudul / Lead OBE</span>
              <input
                maxLength={255}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, obeLead: e.target.value }))
                }
                placeholder="Capaian pembelajaran sebagai arah perancangan mata kuliah."
                value={settingsForm.obeLead ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi OBE</span>
              <textarea
                maxLength={500}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    obeDescription: e.target.value,
                  }))
                }
                placeholder="Kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang dibutuhkan lulusan."
                rows={3}
                value={settingsForm.obeDescription ?? ""}
              />
            </label>
          </div>

          {/* Section 3: Intro & Catatan Tabel */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">3. Teks Tabel Kurikulum Program Studi</h2>

            <label className="aa-field">
              <span>Eyebrow Tabel</span>
              <input
                maxLength={100}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, tableEyebrow: e.target.value }))
                }
                placeholder="STRUKTUR KURIKULUM"
                value={settingsForm.tableEyebrow ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Judul Tabel *</span>
              <input
                maxLength={150}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, tableTitle: e.target.value }))
                }
                placeholder="Komponen pembelajaran program studi"
                required
                value={settingsForm.tableTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi Pengantar Tabel</span>
              <textarea
                maxLength={500}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    tableIntro: e.target.value,
                  }))
                }
                placeholder="Gambaran umum fokus pembelajaran setiap program studi. Untuk rincian mata kuliah, rujuk dokumen kurikulum resmi program studi."
                rows={3}
                value={settingsForm.tableIntro ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Catatan Bawah Tabel</span>
              <input
                maxLength={255}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, tableNote: e.target.value }))
                }
                placeholder="Catatan: rincian mata kuliah dapat berbeda menurut program studi dan periode kurikulum."
                value={settingsForm.tableNote ?? ""}
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

