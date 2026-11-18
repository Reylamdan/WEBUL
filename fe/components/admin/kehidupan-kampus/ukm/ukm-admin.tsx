"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  ukmAdminApi,
  type AdminUkmItem,
  type PublishStatus,
  type UkmItemInput,
  type UkmSettingsInput,
} from "@/lib/ukm-admin-api";

const PAGE_LIMIT = 50;

const UKM_CATEGORIES = [
  { id: "seni", label: "Seni & Kreativitas" },
  { id: "olahraga", label: "Olahraga" },
  { id: "teknologi", label: "Teknologi" },
  { id: "organisasi", label: "Organisasi" },
  { id: "sosial", label: "Sosial & Kerohanian" },
];

// ================= Modal Tambah / Edit UKM =================
function UkmItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminUkmItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<UkmItemInput>({
    title: item?.title ?? "",
    category: item?.category ?? "seni",
    categoryLabel: item?.categoryLabel ?? "Seni & Kreativitas",
    description: item?.description ?? "",
    meta: item?.meta ?? "",
    imageUrl: item?.imageUrl ?? "",
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Nama / judul UKM wajib diisi.");
      return;
    }
    if (!form.description.trim()) {
      setError("Deskripsi UKM wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedCat = UKM_CATEGORIES.find((c) => c.id === form.category);
      const payload: UkmItemInput = {
        ...form,
        title: form.title.trim(),
        categoryLabel: selectedCat ? selectedCat.label : form.categoryLabel,
        description: form.description.trim(),
        meta: form.meta?.trim() || null,
        imageUrl: form.imageUrl?.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (item) {
        await ukmAdminApi.updateItem(item.id, payload);
        onSaved("Data UKM berhasil diperbarui.");
      } else {
        await ukmAdminApi.createItem(payload);
        onSaved("Data UKM baru berhasil ditambahkan.");
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
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">{item ? "Edit Kegiatan Mahasiswa (UKM)" : "Tambah UKM Baru"}</h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}

          <div>
            <label htmlFor={`${uid}-title`}>
              Nama / Judul UKM <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder="Contoh: Seni dan kreativitas / UKM Robotika"
              required
              type="text"
              value={form.title}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-category`}>
              Bidang / Kategori <span className="aa-required">*</span>
            </label>
            <select
              id={`${uid}-category`}
              onChange={(e) => {
                const catId = e.target.value;
                const found = UKM_CATEGORIES.find((c) => c.id === catId);
                setForm((cur) => ({
                  ...cur,
                  category: catId,
                  categoryLabel: found ? found.label : cur.categoryLabel,
                }));
              }}
              value={form.category}
            >
              {UKM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${uid}-desc`}>
              Deskripsi Singkat <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-desc`}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Ruang untuk berekspresi melalui karya, pertunjukan, dan kegiatan..."
              required
              rows={3}
              value={form.description}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-meta`}>Keterangan Jadwal / Info Tambahan</label>
            <input
              id={`${uid}-meta`}
              onChange={(e) => setForm((cur) => ({ ...cur, meta: e.target.value }))}
              placeholder="Contoh: Tanggal / informasi selengkapnya atau Latihan tiap Sabtu"
              type="text"
              value={form.meta ?? ""}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-img`}>URL Foto / Dokumentasi (Opsional)</label>
            <input
              id={`${uid}-img`}
              onChange={(e) => setForm((cur) => ({ ...cur, imageUrl: e.target.value }))}
              placeholder="https://..."
              type="url"
              value={form.imageUrl ?? ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan Tampilan</label>
              <input
                id={`${uid}-sort`}
                min={0}
                onChange={(e) => setForm((cur) => ({ ...cur, sortOrder: Number(e.target.value) || 0 }))}
                type="number"
                value={form.sortOrder}
              />
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
          </div>

          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah UKM"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama UkmAdmin =================

export function UkmAdmin() {
  const [activeTab, setActiveTab] = useState<"items" | "settings">("items");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Items filter & search
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 400);
  const [statusFilter, setStatusFilter] = useState<PublishStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [refreshItems, setRefreshItems] = useState(0);
  const [editingItem, setEditingItem] = useState<AdminUkmItem | "new" | null>(null);

  // Settings state
  const [refreshSettings, setRefreshSettings] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<UkmSettingsInput>({
    heroEyebrow: "ORGANISASI & KOMUNITAS",
    heroTitle: "Kegiatan Mahasiswa (UKM)",
    heroSubtitle:
      "Temukan ruang untuk mengembangkan minat, berkarya, berkolaborasi, dan membangun pengalaman di luar kelas.",
    heroBadge: "Universitas LIA — Komunitas & UKM",
    introEyebrow: "KOMUNITAS MAHASISWA",
    introTitle: "Temukan komunitas yang sesuai dengan minatmu",
    introDescription:
      "UKM menjadi ruang untuk belajar bersama, mengasah kemampuan, dan menciptakan pengalaman kampus yang berkesan.",
    categoryTitle: "Jelajahi bidang kegiatan",
    categoryDesc: "Pilih bidang yang paling dekat dengan minat dan ketertarikanmu.",
    cardsTitle: "Kenali komunitas mahasiswa",
    cardsDesc:
      "Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi setelah data resmi tersedia.",
    ctaTitle: "Tertarik bergabung dengan UKM?",
    ctaDescription:
      "Informasi kontak, jadwal open recruitment, dan tautan pendaftaran akan ditambahkan di sini.",
    ctaButtonLabel: "Informasi Pendaftaran",
    modalTitle: "Pendaftaran Kegiatan Mahasiswa (UKM)",
    modalSubtitle: "Informasi Open Recruitment Universitas LIA",
    modalScheduleText:
      "Pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik.",
    modalRequirementsText:
      "Mahasiswa aktif Universitas LIA dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa.",
    modalContactEmail: "kemahasiswaan@universitaslia.ac.id",
  });

  // Queries
  const itemsList = useApi(
    `ukm-items-${statusFilter}-${categoryFilter}-${search}-${refreshItems}`,
    () =>
      ukmAdminApi.listItems({
        status: statusFilter,
        category: categoryFilter,
        search,
        limit: PAGE_LIMIT,
      })
  );

  const settingsData = useApi(`ukm-settings-${refreshSettings}`, () => ukmAdminApi.getSettings());

  useEffect(() => {
    if (settingsData.data?.settings) {
      const s = settingsData.data.settings;
      setSettingsForm({
        heroEyebrow: s.heroEyebrow ?? "ORGANISASI & KOMUNITAS",
        heroTitle: s.heroTitle ?? "Kegiatan Mahasiswa (UKM)",
        heroSubtitle: s.heroSubtitle ?? "",
        heroBadge: s.heroBadge ?? "Universitas LIA — Komunitas & UKM",
        introEyebrow: s.introEyebrow ?? "KOMUNITAS MAHASISWA",
        introTitle: s.introTitle ?? "Temukan komunitas yang sesuai dengan minatmu",
        introDescription: s.introDescription ?? "",
        categoryTitle: s.categoryTitle ?? "Jelajahi bidang kegiatan",
        categoryDesc: s.categoryDesc ?? "",
        cardsTitle: s.cardsTitle ?? "Kenali komunitas mahasiswa",
        cardsDesc: s.cardsDesc ?? "",
        ctaTitle: s.ctaTitle ?? "Tertarik bergabung dengan UKM?",
        ctaDescription: s.ctaDescription ?? "",
        ctaButtonLabel: s.ctaButtonLabel ?? "Informasi Pendaftaran",
        modalTitle: s.modalTitle ?? "Pendaftaran Kegiatan Mahasiswa (UKM)",
        modalSubtitle: s.modalSubtitle ?? "Informasi Open Recruitment Universitas LIA",
        modalScheduleText: s.modalScheduleText ?? "",
        modalRequirementsText: s.modalRequirementsText ?? "",
        modalContactEmail: s.modalContactEmail ?? "kemahasiswaan@universitaslia.ac.id",
      });
    }
  }, [settingsData.data]);

  // Actions
  async function handleDelete(item: AdminUkmItem) {
    if (!window.confirm(`Hapus UKM "${item.title}"?`)) return;
    try {
      setActionError(null);
      await ukmAdminApi.deleteItem(item.id);
      setNotice(`UKM "${item.title}" berhasil dihapus.`);
      setRefreshItems((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleStatus(item: AdminUkmItem) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await ukmAdminApi.updateItem(item.id, { status: nextStatus });
      setRefreshItems((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await ukmAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan halaman UKM berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Kegiatan Mahasiswa / UKM</h1>
          <p className="aa-subtitle">
            Kelola data Unit Kegiatan Mahasiswa (UKM), kategori bidang kegiatan, teks halaman, dan modal informasi pendaftaran.
          </p>
        </div>
        <div>
          {activeTab === "items" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingItem("new")}
              type="button"
            >
              + Tambah UKM
            </button>
          )}
        </div>
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu UKM" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "items" ? "is-active" : ""}`}
          onClick={() => setActiveTab("items")}
          type="button"
        >
          Daftar UKM &amp; Komunitas
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Halaman &amp; Pendaftaran
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

      {/* ================= TAB 1: DAFTAR UKM ================= */}
      {activeTab === "items" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari UKM"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama UKM, deskripsi, info..."
              type="search"
              value={searchInput}
            />
            <select
              aria-label="Filter kategori"
              onChange={(e) => setCategoryFilter(e.target.value)}
              value={categoryFilter}
            >
              <option value="">Semua bidang</option>
              {UKM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter status"
              onChange={(e) => setStatusFilter(e.target.value as PublishStatus | "")}
              value={statusFilter}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {itemsList.error && !itemsList.data ? (
            <p className="aa-error">{errorMessage(itemsList.error)}</p>
          ) : itemsList.loading && !itemsList.data ? (
            <p className="aa-empty">Memuat daftar kegiatan mahasiswa...</p>
          ) : (itemsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada data UKM / kegiatan mahasiswa.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: "center" }}>No</th>
                    <th style={{ width: 160 }}>Bidang</th>
                    <th style={{ width: 220 }}>Nama UKM</th>
                    <th>Deskripsi &amp; Informasi</th>
                    <th style={{ width: 90, textAlign: "center" }}>Urutan</th>
                    <th style={{ width: 110, textAlign: "center" }}>Status</th>
                    <th style={{ width: 140, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.data?.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "#666" }}>{idx + 1}</td>
                      <td>
                        <span className="aa-badge aa-badge-info">
                          {item.categoryLabel || item.category}
                        </span>
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontSize: "0.9rem" }}>{item.description}</p>
                        {item.meta && (
                          <small style={{ color: "#666", display: "block", marginTop: 4 }}>
                            {item.meta}
                          </small>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>{item.sortOrder}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${item.status === "published" ? "aa-badge-success" : "aa-badge-warning"}`}
                          onClick={() => handleToggleStatus(item)}
                          style={{ cursor: "pointer", border: "none" }}
                          title="Klik untuk ubah status"
                          type="button"
                        >
                          {item.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-secondary"
                          onClick={() => setEditingItem(item)}
                          style={{ marginRight: 6 }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="aa-btn aa-btn-sm aa-btn-danger"
                          onClick={() => handleDelete(item)}
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

      {/* ================= TAB 2: PENGATURAN HALAMAN ================= */}
      {activeTab === "settings" && (
        <form className="aa-form-panel" onSubmit={handleSaveSettings}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>
            1. Banner Utama (Hero)
          </h2>
          <div>
            <label htmlFor="ukm-hero-eyebrow">Eyebrow Banner</label>
            <input
              id="ukm-hero-eyebrow"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroEyebrow: e.target.value }))}
              placeholder="ORGANISASI & KOMUNITAS"
              required
              type="text"
              value={settingsForm.heroEyebrow ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-hero-title">Judul Utama Banner</label>
            <input
              id="ukm-hero-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
              placeholder="Kegiatan Mahasiswa (UKM)"
              required
              type="text"
              value={settingsForm.heroTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-hero-sub">Subjudul / Deskripsi Banner</label>
            <textarea
              id="ukm-hero-sub"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroSubtitle: e.target.value }))}
              placeholder="Temukan ruang untuk mengembangkan minat, berkarya..."
              required
              rows={2}
              value={settingsForm.heroSubtitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-hero-badge">Label Badge Banner</label>
            <input
              id="ukm-hero-badge"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroBadge: e.target.value }))}
              placeholder="Universitas LIA — Komunitas & UKM"
              required
              type="text"
              value={settingsForm.heroBadge ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            2. Bagian Pengantar (Intro)
          </h2>
          <div>
            <label htmlFor="ukm-intro-eyebrow">Eyebrow Pengantar</label>
            <input
              id="ukm-intro-eyebrow"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, introEyebrow: e.target.value }))}
              placeholder="KOMUNITAS MAHASISWA"
              required
              type="text"
              value={settingsForm.introEyebrow ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-intro-title">Judul Pengantar</label>
            <input
              id="ukm-intro-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, introTitle: e.target.value }))}
              placeholder="Temukan komunitas yang sesuai dengan minatmu"
              required
              type="text"
              value={settingsForm.introTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-intro-desc">Deskripsi Pengantar</label>
            <textarea
              id="ukm-intro-desc"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, introDescription: e.target.value }))}
              placeholder="UKM menjadi ruang untuk belajar bersama..."
              required
              rows={3}
              value={settingsForm.introDescription ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            3. Heading Bidang &amp; Komunitas
          </h2>
          <div>
            <label htmlFor="ukm-cat-title">Judul Bagian Bidang Kegiatan</label>
            <input
              id="ukm-cat-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, categoryTitle: e.target.value }))}
              placeholder="Jelajahi bidang kegiatan"
              required
              type="text"
              value={settingsForm.categoryTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-cat-desc">Deskripsi Bagian Bidang Kegiatan</label>
            <input
              id="ukm-cat-desc"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, categoryDesc: e.target.value }))}
              placeholder="Pilih bidang yang paling dekat dengan minat dan ketertarikanmu."
              required
              type="text"
              value={settingsForm.categoryDesc ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-card-title">Judul Bagian Kartu Komunitas</label>
            <input
              id="ukm-card-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, cardsTitle: e.target.value }))}
              placeholder="Kenali komunitas mahasiswa"
              required
              type="text"
              value={settingsForm.cardsTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-card-desc">Deskripsi Bagian Kartu Komunitas</label>
            <input
              id="ukm-card-desc"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, cardsDesc: e.target.value }))}
              placeholder="Profil UKM, jadwal, dan informasi pendaftaran dapat dilengkapi..."
              required
              type="text"
              value={settingsForm.cardsDesc ?? ""}
            />
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
            4. Kotak Ajakan (CTA) &amp; Modal Pendaftaran
          </h2>
          <div>
            <label htmlFor="ukm-cta-title">Judul Kotak Ajakan (CTA)</label>
            <input
              id="ukm-cta-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, ctaTitle: e.target.value }))}
              placeholder="Tertarik bergabung dengan UKM?"
              required
              type="text"
              value={settingsForm.ctaTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-cta-desc">Deskripsi Kotak Ajakan</label>
            <textarea
              id="ukm-cta-desc"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, ctaDescription: e.target.value }))}
              placeholder="Informasi kontak, jadwal open recruitment..."
              required
              rows={2}
              value={settingsForm.ctaDescription ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-cta-btn">Teks Tombol CTA</label>
            <input
              id="ukm-cta-btn"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, ctaButtonLabel: e.target.value }))}
              placeholder="Informasi Pendaftaran"
              required
              type="text"
              value={settingsForm.ctaButtonLabel ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-modal-title">Judul Jendela Modal Pendaftaran</label>
            <input
              id="ukm-modal-title"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, modalTitle: e.target.value }))}
              placeholder="Pendaftaran Kegiatan Mahasiswa (UKM)"
              required
              type="text"
              value={settingsForm.modalTitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-modal-sub">Subjudul Modal</label>
            <input
              id="ukm-modal-sub"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, modalSubtitle: e.target.value }))}
              placeholder="Informasi Open Recruitment Universitas LIA"
              required
              type="text"
              value={settingsForm.modalSubtitle ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-modal-sch">Teks Informasi Jadwal Open Recruitment</label>
            <textarea
              id="ukm-modal-sch"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, modalScheduleText: e.target.value }))}
              placeholder="Pendaftaran terbuka untuk mahasiswa baru dan aktif..."
              required
              rows={2}
              value={settingsForm.modalScheduleText ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-modal-req">Teks Persyaratan Pendaftaran</label>
            <textarea
              id="ukm-modal-req"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, modalRequirementsText: e.target.value }))}
              placeholder="Mahasiswa aktif Universitas LIA dengan komitmen..."
              required
              rows={2}
              value={settingsForm.modalRequirementsText ?? ""}
            />
          </div>

          <div>
            <label htmlFor="ukm-modal-mail">Email Kontak Kemahasiswaan</label>
            <input
              id="ukm-modal-mail"
              onChange={(e) => setSettingsForm((cur) => ({ ...cur, modalContactEmail: e.target.value }))}
              placeholder="kemahasiswaan@universitaslia.ac.id"
              required
              type="email"
              value={settingsForm.modalContactEmail ?? ""}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="aa-btn aa-btn-primary" disabled={savingSettings} type="submit">
              {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      )}

      {/* Modal Form Tambah / Edit */}
      {editingItem && (
        <UkmItemModal
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshItems((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

