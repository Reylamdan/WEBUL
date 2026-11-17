"use client";

import { useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  facilityAdminApi,
  type AdminCampusFacility,
  type FacilityInput,
  type FacilitySettingsInput,
  type FacilityStatus,
} from "@/lib/facility-admin-api";

const PAGE_LIMIT = 10;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FACILITY_FORM: FacilityInput = {
  title: "",
  description: "",
  sortOrder: 0,
  status: "draft",
};

function toFacilityForm(facility: AdminCampusFacility): FacilityInput {
  return {
    title: facility.title,
    description: facility.description,
    sortOrder: facility.sortOrder,
    status: facility.status,
  };
}

// ---------- Modal Tambah / Ubah Fasilitas ----------

function FacilityModal({
  facility,
  onClose,
  onSaved,
}: {
  facility: AdminCampusFacility | null;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<FacilityInput>(facility ? toFacilityForm(facility) : EMPTY_FACILITY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unggah gambar fasilitas
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) return setPreviewUrl(null);
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const shownImage = previewUrl ?? (removeImage ? null : facility?.imageUrl ?? null);

  function pickImage(file: File | undefined) {
    setImageError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setImageError("Format harus JPEG, PNG, atau WebP.");
    if (file.size > IMAGE_MAX_BYTES) return setImageError("Ukuran gambar maksimal 5 MB.");
    setImageFile(file);
    setRemoveImage(false);
  }

  function clearImage() {
    setImageFile(null);
    setImageError(null);
    if (fileInput.current) fileInput.current.value = "";
    if (facility?.imageUrl) setRemoveImage(true);
  }

  const set = <K extends keyof FacilityInput>(key: K, value: FacilityInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = facility ? await facilityAdminApi.update(facility.id, form) : await facilityAdminApi.create(form);

      // Gambar diproses setelah data utama berhasil disimpan
      try {
        if (imageFile) await facilityAdminApi.uploadImage(saved.id, imageFile);
        else if (removeImage && facility?.imageUrl) await facilityAdminApi.removeImage(saved.id);
      } catch (imgErr) {
        onSaved(`Data tersimpan, namun foto gagal diperbarui: ${errorMessage(imgErr)}`);
        return;
      }

      onSaved(facility ? "Fasilitas berhasil diperbarui." : "Fasilitas baru berhasil ditambahkan.");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {facility ? "Ubah Fasilitas Kampus" : "Tambah Fasilitas Kampus"}
        </h2>

        <div className="aa-row">
          <label className="aa-field">
            <span>Nama Fasilitas *</span>
            <input
              maxLength={150}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Contoh: Perpustakaan Digital, Lab Komputer"
              required
              value={form.title}
            />
          </label>

          <label className="aa-field" style={{ maxWidth: 140 }}>
            <span>Urutan</span>
            <input
              max={9999}
              min={0}
              onChange={(e) => set("sortOrder", Math.max(0, Math.min(9999, Math.trunc(Number(e.target.value) || 0))))}
              type="number"
              value={form.sortOrder}
            />
          </label>
        </div>

        <label className="aa-field">
          <span>Deskripsi Fasilitas *</span>
          <textarea
            maxLength={1000}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Keterangan mengenai fasilitas, perlengkapan, dan daya tampung..."
            required
            rows={4}
            value={form.description}
          />
        </label>

        {/* Gambar Fasilitas */}
        <div className="aa-field">
          <span>Foto Fasilitas (Opsional)</span>
          <div className="aa-image-box">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Pratinjau foto fasilitas" className="aa-image-preview" src={shownImage} />
            ) : (
              <div className="aa-image-empty">Belum ada foto. Tampil dengan placeholder default.</div>
            )}
            <div className="aa-image-actions">
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih foto fasilitas"
                hidden
                onChange={(e) => pickImage(e.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <button className="aa-btn aa-btn-sm" onClick={() => fileInput.current?.click()} type="button">
                {shownImage ? "Ganti Foto" : "Pilih Foto"}
              </button>
              {shownImage && (
                <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={clearImage} type="button">
                  Hapus Foto
                </button>
              )}
              <small>JPEG, PNG, atau WebP · maks. 5 MB</small>
            </div>
          </div>
          {imageError && (
            <p className="aa-error" role="alert">
              {imageError}
            </p>
          )}
        </div>

        <label className="aa-field">
          <span>Status Publikasi</span>
          <select onChange={(e) => set("status", e.target.value as FacilityStatus)} value={form.status}>
            <option value="draft">Draft (hanya terlihat di admin)</option>
            <option value="published">Published (tampil di website)</option>
          </select>
        </label>

        {error && (
          <p className="aa-error" role="alert">
            {error}
          </p>
        )}

        <div className="aa-modal-actions">
          <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
            {saving ? "Menyimpan..." : facility ? "Simpan Perubahan" : "Tambah Fasilitas"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Komponen Utama FasilitasAdmin ----------

export function FasilitasAdmin() {
  const [activeTab, setActiveTab] = useState<"facilities" | "settings">("facilities");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- Tab 1: Daftar Fasilitas ---
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [status, setStatus] = useState<FacilityStatus | "">("");
  const [page, setPage] = useState(1);
  const [refreshFacilities, setRefreshFacilities] = useState(0);
  const [editingFacility, setEditingFacility] = useState<AdminCampusFacility | "new" | null>(null);

  useEffect(() => setPage(1), [search, status]);

  const facilitiesList = useApi(`facility-admin-list:${page}:${search}:${status}:${refreshFacilities}`, () =>
    facilityAdminApi.list({ page, limit: PAGE_LIMIT, search, status })
  );

  const items = facilitiesList.data?.items ?? [];
  const pagination = facilitiesList.data?.pagination;

  async function toggleStatus(item: AdminCampusFacility) {
    setActionError(null);
    try {
      await facilityAdminApi.update(item.id, {
        status: item.status === "published" ? "draft" : "published",
      });
      setNotice(item.status === "published" ? "Fasilitas dikembalikan ke draft." : "Fasilitas dipublikasikan.");
      setRefreshFacilities((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function removeFacility(item: AdminCampusFacility) {
    if (!window.confirm(`Hapus fasilitas "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await facilityAdminApi.remove(item.id);
      setNotice(`Fasilitas "${item.title}" berhasil dihapus.`);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else setRefreshFacilities((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  // --- Tab 2: Pengaturan Header Halaman ---
  const [refreshSettings, setRefreshSettings] = useState(0);
  const settingsApiData = useApi(`facility-admin-settings:${refreshSettings}`, facilityAdminApi.getSettings);
  const reloadSettings = () => setRefreshSettings((n) => n + 1);

  const [settingsForm, setSettingsForm] = useState<FacilitySettingsInput>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Gambar Hero
  const heroFileInput = useRef<HTMLInputElement>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [removeHero, setRemoveHero] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsApiData.data) {
      const s = settingsApiData.data;
      setSettingsForm({
        heroTitle: s.heroTitle,
        heroSubtitle: s.heroSubtitle,
        galleryEyebrow: s.galleryEyebrow,
        galleryTitle: s.galleryTitle,
        galleryDescription: s.galleryDescription,
      });
    }
  }, [settingsApiData.data]);

  useEffect(() => {
    if (!heroFile) return setHeroPreviewUrl(null);
    const url = URL.createObjectURL(heroFile);
    setHeroPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [heroFile]);

  const shownHeroImage = heroPreviewUrl ?? (removeHero ? null : settingsApiData.data?.heroImageUrl ?? null);

  function pickHeroImage(file: File | undefined) {
    setHeroError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setHeroError("Format harus JPEG, PNG, atau WebP.");
    if (file.size > IMAGE_MAX_BYTES) return setHeroError("Ukuran gambar maksimal 5 MB.");
    setHeroFile(file);
    setRemoveHero(false);
  }

  function clearHeroImage() {
    setHeroFile(null);
    setHeroError(null);
    if (heroFileInput.current) heroFileInput.current.value = "";
    if (settingsApiData.data?.heroImageUrl) setRemoveHero(true);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    setNotice(null);

    try {
      await facilityAdminApi.updateSettings(settingsForm);

      if (heroFile) {
        await facilityAdminApi.uploadHeroImage(heroFile);
        setHeroFile(null);
      } else if (removeHero && settingsApiData.data?.heroImageUrl) {
        await facilityAdminApi.removeHeroImage();
        setRemoveHero(false);
      }

      setNotice("Pengaturan header fasilitas kampus berhasil disimpan.");
      reloadSettings();
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
          <h1 className="aa-title">Fasilitas Kampus</h1>
          <p className="aa-subtitle">
            Kelola galeri fasilitas pendukung kampus (perpustakaan, ruang kelas, laboratorium, dll) dan teks pengantar halaman.
          </p>
        </div>
        {activeTab === "facilities" && (
          <button className="aa-btn aa-btn-primary" onClick={() => setEditingFacility("new")} type="button">
            + Tambah Fasilitas
          </button>
        )}
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Fasilitas" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "facilities" ? "is-active" : ""}`}
          onClick={() => setActiveTab("facilities")}
          type="button"
        >
          Daftar Fasilitas (Galeri)
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
        <p aria-live="polite" className="aa-notice" onClick={() => setNotice(null)} role="status">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="aa-error" role="alert">
          {actionError}
        </p>
      )}

      {/* ================= TAB 1: DAFTAR FASILITAS (CRUD) ================= */}
      {activeTab === "facilities" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari fasilitas"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama fasilitas..."
              type="search"
              value={searchInput}
            />
            <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as FacilityStatus | "")} value={status}>
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {facilitiesList.error && !facilitiesList.data ? (
            <p className="aa-error" role="alert">
              {errorMessage(facilitiesList.error)}
            </p>
          ) : facilitiesList.loading && !facilitiesList.data ? (
            <p aria-live="polite" className="aa-empty">
              Memuat data fasilitas...
            </p>
          ) : items.length === 0 ? (
            <p className="aa-empty">Belum ada fasilitas kampus. Klik &quot;+ Tambah Fasilitas&quot; untuk membuat yang pertama.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Fasilitas</th>
                    <th>Urutan</th>
                    <th>Status</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((facility) => (
                    <tr key={facility.id}>
                      <td>
                        <div className="aa-event-cell">
                          {facility.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="aa-thumb" loading="lazy" src={facility.imageUrl} />
                          ) : (
                            <div
                              style={{
                                width: 64,
                                aspectRatio: "16/9",
                                background: "#edf2f6",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                color: "#8c9ba5",
                              }}
                            >
                              No Foto
                            </div>
                          )}
                          <div>
                            <strong>{facility.title}</strong>
                            <small>{facility.description}</small>
                          </div>
                        </div>
                      </td>
                      <td>{facility.sortOrder}</td>
                      <td>
                        <span className={`aa-badge aa-badge-${facility.status}`}>
                          {facility.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="aa-actions">
                        <button className="aa-btn aa-btn-sm" onClick={() => toggleStatus(facility)} type="button">
                          {facility.status === "published" ? "Jadikan Draft" : "Publish"}
                        </button>
                        <button className="aa-btn aa-btn-sm" onClick={() => setEditingFacility(facility)} type="button">
                          Ubah
                        </button>
                        <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => removeFacility(facility)} type="button">
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
              <button className="aa-btn aa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">
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

          {editingFacility && (
            <FacilityModal
              facility={editingFacility === "new" ? null : editingFacility}
              onClose={() => setEditingFacility(null)}
              onSaved={(msg) => {
                setEditingFacility(null);
                if (msg) setNotice(msg);
                setRefreshFacilities((n) => n + 1);
              }}
            />
          )}
        </>
      )}

      {/* ================= TAB 2: PENGATURAN HEADER HALAMAN ================= */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section Hero */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">1. Bagian Hero (Header Halaman Fasilitas)</h2>

            <label className="aa-field">
              <span>Judul Hero *</span>
              <input
                maxLength={150}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
                placeholder="Fasilitas Kampus"
                required
                value={settingsForm.heroTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Subjudul Hero *</span>
              <textarea
                maxLength={500}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                placeholder="Kenali fasilitas kampus yang mendukung kegiatan belajar..."
                required
                rows={2}
                value={settingsForm.heroSubtitle ?? ""}
              />
            </label>

            <div className="aa-field">
              <span>Gambar Hero (Opsional)</span>
              <div className="aa-image-box">
                {shownHeroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Pratinjau hero fasilitas" className="aa-image-preview" src={shownHeroImage} />
                ) : (
                  <div className="aa-image-empty">Belum ada gambar (menampilkan placeholder default)</div>
                )}
                <div className="aa-image-actions">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Pilih gambar hero fasilitas"
                    hidden
                    onChange={(e) => pickHeroImage(e.target.files?.[0])}
                    ref={heroFileInput}
                    type="file"
                  />
                  <button className="aa-btn aa-btn-sm" onClick={() => heroFileInput.current?.click()} type="button">
                    {shownHeroImage ? "Ganti Gambar Hero" : "Pilih Gambar Hero"}
                  </button>
                  {shownHeroImage && (
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={clearHeroImage} type="button">
                      Hapus Gambar Hero
                    </button>
                  )}
                  <small>JPEG, PNG, atau WebP · maks. 5 MB</small>
                </div>
              </div>
              {heroError && (
                <p className="aa-error" role="alert">
                  {heroError}
                </p>
              )}
            </div>
          </div>

          {/* Section Galeri Header */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">2. Pengantar Galeri Fasilitas</h2>

            <div className="aa-row">
              <label className="aa-field" style={{ maxWidth: 220 }}>
                <span>Eyebrow Galeri *</span>
                <input
                  maxLength={100}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, galleryEyebrow: e.target.value }))}
                  placeholder="FASILITAS PENDUKUNG"
                  required
                  value={settingsForm.galleryEyebrow ?? ""}
                />
              </label>

              <label className="aa-field">
                <span>Judul Galeri *</span>
                <input
                  maxLength={150}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, galleryTitle: e.target.value }))}
                  placeholder="Ruang untuk Belajar dan Berkembang"
                  required
                  value={settingsForm.galleryTitle ?? ""}
                />
              </label>
            </div>

            <label className="aa-field">
              <span>Deskripsi Pengantar Galeri *</span>
              <textarea
                maxLength={500}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, galleryDescription: e.target.value }))}
                placeholder="Galeri fasilitas kampus akan dilengkapi foto dan deskripsi resmi..."
                required
                rows={2}
                value={settingsForm.galleryDescription ?? ""}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="aa-btn aa-btn-primary" disabled={savingSettings} style={{ padding: "12px 24px" }} type="submit">
              {savingSettings ? "Menyimpan Pengaturan..." : "Simpan Pengaturan Header"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

