"use client";

import { useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  organizationAdminApi,
  type AdminOrganizationUnit,
  type OrganizationCategoryOption,
  type OrganizationStatus,
  type OrganizationUnitInput,
} from "@/lib/organization-admin-api";
import type { OrganizationCategorySlug } from "@/lib/api";

const PAGE_LIMIT = 10;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM: OrganizationUnitInput = {
  title: "",
  position: null,
  description: null,
  category: "unit",
  sortOrder: 0,
  status: "draft",
};

function toForm(unit: AdminOrganizationUnit): OrganizationUnitInput {
  return {
    title: unit.title,
    position: unit.position,
    description: unit.description,
    category: unit.category.slug,
    sortOrder: unit.sortOrder,
    status: unit.status,
  };
}

// ---------- Formulir tambah / ubah ----------

function UnitForm({
  categories,
  unit,
  onClose,
  onSaved,
}: {
  categories: OrganizationCategoryOption[];
  unit: AdminOrganizationUnit | null;
  onClose: () => void;
  onSaved: (warning?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<OrganizationUnitInput>(unit ? toForm(unit) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gambar opsional: file baru, atau tandai gambar lama untuk dihapus.
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!imageFile) return setPreviewUrl(null);
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const shownImage = previewUrl ?? (removeImage ? null : unit?.imageUrl ?? null);

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
    if (unit?.imageUrl) setRemoveImage(true);
  }

  const set = <K extends keyof OrganizationUnitInput>(key: K, value: OrganizationUnitInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  // Kolom teks opsional: kosong dikirim sebagai null.
  const optional = (value: string) => (value.trim() === "" ? null : value);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = unit ? await organizationAdminApi.update(unit.id, form) : await organizationAdminApi.create(form);
      // Gambar dikirim setelah data tersimpan. Jika gagal, data tetap aman.
      try {
        if (imageFile) await organizationAdminApi.uploadImage(saved.id, imageFile);
        else if (removeImage && unit?.imageUrl) await organizationAdminApi.removeImage(saved.id);
      } catch (imgErr) {
        onSaved(`Data tersimpan, tetapi gambar gagal diunggah: ${errorMessage(imgErr)} Klik "Ubah" untuk mencoba lagi.`);
        return;
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const isBagan = form.category === "bagan";

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {unit ? "Ubah Struktur Organisasi" : "Tambah Struktur Organisasi"}
        </h2>

        <label className="aa-field">
          <span>Judul *</span>
          <input
            maxLength={150}
            minLength={3}
            onChange={(e) => set("title", e.target.value)}
            placeholder={isBagan ? "Bagan Organisasi Universitas LIA" : "Rektorat / Biro Akademik"}
            required
            value={form.title}
          />
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>Kategori *</span>
            <select onChange={(e) => set("category", e.target.value as OrganizationCategorySlug)} required value={form.category}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="aa-field">
            <span>Urutan tampil</span>
            <input
              max={9999}
              min={0}
              onChange={(e) => set("sortOrder", Math.max(0, Math.min(9999, Math.trunc(Number(e.target.value) || 0))))}
              type="number"
              value={form.sortOrder}
            />
          </label>
        </div>

        {!isBagan && (
          <label className="aa-field">
            <span>Jabatan / keterangan singkat</span>
            <input
              maxLength={150}
              onChange={(e) => set("position", optional(e.target.value))}
              placeholder="Rektor / Unit pendukung akademik"
              value={form.position ?? ""}
            />
          </label>
        )}

        <div className="aa-field">
          <span>Gambar (opsional)</span>
          <div className="aa-image-box">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Pratinjau gambar" className="aa-image-preview" src={shownImage} />
            ) : (
              <div className="aa-image-empty">Belum ada gambar. Data akan tampil tanpa gambar.</div>
            )}
            <div className="aa-image-actions">
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih gambar"
                hidden
                onChange={(e) => pickImage(e.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <button className="aa-btn aa-btn-sm" onClick={() => fileInput.current?.click()} type="button">
                {shownImage ? "Ganti gambar" : "Pilih gambar"}
              </button>
              {shownImage && (
                <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={clearImage} type="button">
                  Hapus gambar
                </button>
              )}
              <small>JPEG, PNG, atau WebP · maks. 5 MB{isBagan ? " · bagan: gunakan gambar beresolusi tinggi" : ""}</small>
            </div>
          </div>
          {imageError && (
            <p className="aa-error" role="alert">
              {imageError}
            </p>
          )}
        </div>

        <label className="aa-field">
          <span>Deskripsi</span>
          <textarea maxLength={5000} onChange={(e) => set("description", optional(e.target.value))} rows={5} value={form.description ?? ""} />
        </label>

        <label className="aa-field">
          <span>Status</span>
          <select onChange={(e) => set("status", e.target.value as OrganizationStatus)} value={form.status}>
            <option value="draft">Draft (belum tampil di website)</option>
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
            {saving ? "Menyimpan..." : unit ? "Simpan Perubahan" : "Tambah"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Halaman daftar ----------

export function StrukturAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState<OrganizationCategorySlug | "">("");
  const [status, setStatus] = useState<OrganizationStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<AdminOrganizationUnit | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, category, status]);

  const categories = useApi("organization-admin-categories", organizationAdminApi.categories);
  const list = useApi(`organization-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    organizationAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status }),
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  async function togglePublish(unit: AdminOrganizationUnit) {
    setActionError(null);
    try {
      await organizationAdminApi.update(unit.id, { status: unit.status === "published" ? "draft" : "published" });
      setNotice(unit.status === "published" ? "Dikembalikan ke draft." : "Dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(unit: AdminOrganizationUnit) {
    if (!window.confirm(`Hapus "${unit.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await organizationAdminApi.remove(unit.id);
      setNotice("Data dihapus.");
      if (items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Struktur Organisasi</h1>
          <p className="aa-subtitle">
            Kelola bagan organisasi dan kartu unit/pimpinan yang tampil di halaman Profil &gt; Struktur Organisasi. Gambar bersifat opsional.
          </p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
          + Tambah Data
        </button>
      </header>

      <div className="aa-filters">
        <input
          aria-label="Cari judul"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul..."
          type="search"
          value={searchInput}
        />
        <select aria-label="Filter kategori" onChange={(e) => setCategory(e.target.value as OrganizationCategorySlug | "")} value={category}>
          <option value="">Semua kategori</option>
          {categories.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as OrganizationStatus | "")} value={status}>
          <option value="">Semua status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

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

      {list.error && !list.data ? (
        <p className="aa-error" role="alert">
          {errorMessage(list.error)}
        </p>
      ) : list.loading && !list.data ? (
        <p aria-live="polite" className="aa-empty">
          Memuat data...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada data yang cocok. Klik &quot;Tambah Data&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Urutan</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <div className="aa-event-cell">
                      {unit.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="aa-thumb" loading="lazy" src={unit.imageUrl} />
                      )}
                      <div>
                        <strong>{unit.title}</strong>
                        {unit.position && <small>{unit.position}</small>}
                      </div>
                    </div>
                  </td>
                  <td>{unit.category.name}</td>
                  <td>{unit.sortOrder}</td>
                  <td>
                    <span className={`aa-badge aa-badge-${unit.status}`}>{unit.status === "published" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="aa-actions">
                    <button className="aa-btn aa-btn-sm" onClick={() => togglePublish(unit)} type="button">
                      {unit.status === "published" ? "Jadikan Draft" : "Publish"}
                    </button>
                    <button className="aa-btn aa-btn-sm" onClick={() => setEditing(unit)} type="button">
                      Ubah
                    </button>
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => remove(unit)} type="button">
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
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}

      {editing && categories.data && (
        <UnitForm
          categories={categories.data}
          onClose={() => setEditing(null)}
          onSaved={(warning) => {
            if (warning) setActionError(warning);
            else setNotice(editing === "new" ? "Data ditambahkan." : "Perubahan disimpan.");
            setEditing(null);
            reload();
          }}
          unit={editing === "new" ? null : editing}
        />
      )}
    </section>
  );
}
