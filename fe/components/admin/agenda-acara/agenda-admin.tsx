"use client";

import { useEffect, useId, useRef, useState } from "react";
import { errorMessage, formatDate } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  agendaAdminApi,
  type AdminAgendaEvent,
  type AgendaCategoryOption,
  type AgendaEventInput,
  type AgendaStatus,
} from "@/lib/agenda-admin-api";

const PAGE_LIMIT = 10;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM: AgendaEventInput = {
  title: "",
  description: null,
  startDate: "",
  endDate: "",
  startTime: null,
  endTime: null,
  location: null,
  organizer: null,
  registrationUrl: null,
  category: "seminar-webinar",
  status: "draft",
};

function toForm(event: AdminAgendaEvent): AgendaEventInput {
  return {
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    organizer: event.organizer,
    registrationUrl: event.registrationUrl,
    category: event.category.slug,
    status: event.status,
  };
}

// ---------- Formulir tambah / ubah ----------

function EventForm({
  categories,
  event,
  onClose,
  onSaved,
}: {
  categories: AgendaCategoryOption[];
  event: AdminAgendaEvent | null;
  onClose: () => void;
  onSaved: (warning?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<AgendaEventInput>(event ? toForm(event) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gambar opsional: file baru (belum diunggah) atau tandai gambar lama untuk dihapus.
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
  const shownImage = previewUrl ?? (removeImage ? null : event?.imageUrl ?? null);

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
    if (event?.imageUrl) setRemoveImage(true);
  }

  const set = <K extends keyof AgendaEventInput>(key: K, value: AgendaEventInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  // Kolom teks opsional: kosong dikirim sebagai null.
  const optional = (value: string) => (value.trim() === "" ? null : value);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = event ? await agendaAdminApi.update(event.id, form) : await agendaAdminApi.create(form);
      // Gambar dikirim terpisah setelah data tersimpan. Jika gagal, data acara tetap aman.
      try {
        if (imageFile) await agendaAdminApi.uploadImage(saved.id, imageFile);
        else if (removeImage && event?.imageUrl) await agendaAdminApi.removeImage(saved.id);
      } catch (imgErr) {
        onSaved(`Acara tersimpan, tetapi gambar gagal diunggah: ${errorMessage(imgErr)} Klik "Ubah" untuk mencoba lagi.`);
        return;
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {event ? "Ubah Acara" : "Tambah Acara"}
        </h2>

        <label className="aa-field">
          <span>Judul acara *</span>
          <input maxLength={200} minLength={3} onChange={(e) => set("title", e.target.value)} required value={form.title} />
        </label>

        <label className="aa-field">
          <span>Kategori *</span>
          <select onChange={(e) => set("category", e.target.value)} required value={form.category}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>Tanggal mulai *</span>
            <input
              onChange={(e) => {
                const value = e.target.value;
                setForm((c) => ({ ...c, startDate: value, endDate: c.endDate && c.endDate >= value ? c.endDate : value }));
              }}
              required
              type="date"
              value={form.startDate}
            />
          </label>
          <label className="aa-field">
            <span>Tanggal selesai *</span>
            <input min={form.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} required type="date" value={form.endDate} />
          </label>
        </div>

        <div className="aa-row">
          <label className="aa-field">
            <span>Jam mulai</span>
            <input onChange={(e) => set("startTime", optional(e.target.value))} type="time" value={form.startTime ?? ""} />
          </label>
          <label className="aa-field">
            <span>Jam selesai</span>
            <input onChange={(e) => set("endTime", optional(e.target.value))} type="time" value={form.endTime ?? ""} />
          </label>
        </div>

        <label className="aa-field">
          <span>Lokasi</span>
          <input maxLength={200} onChange={(e) => set("location", optional(e.target.value))} placeholder="Aula Utama / Zoom" value={form.location ?? ""} />
        </label>

        <label className="aa-field">
          <span>Penyelenggara</span>
          <input maxLength={150} onChange={(e) => set("organizer", optional(e.target.value))} placeholder="BEM / Prodi / LPPM" value={form.organizer ?? ""} />
        </label>

        <label className="aa-field">
          <span>Tautan pendaftaran</span>
          <input onChange={(e) => set("registrationUrl", optional(e.target.value))} placeholder="https://..." type="url" value={form.registrationUrl ?? ""} />
        </label>

        <div className="aa-field">
          <span>Gambar acara (opsional)</span>
          <div className="aa-image-box">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Pratinjau gambar acara" className="aa-image-preview" src={shownImage} />
            ) : (
              <div className="aa-image-empty">Belum ada gambar. Acara akan tampil tanpa foto.</div>
            )}
            <div className="aa-image-actions">
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih gambar acara"
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
              <small>JPEG, PNG, atau WebP · maks. 5 MB · disarankan rasio 16:9</small>
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
          <textarea maxLength={5000} onChange={(e) => set("description", optional(e.target.value))} rows={4} value={form.description ?? ""} />
        </label>

        <label className="aa-field">
          <span>Status</span>
          <select onChange={(e) => set("status", e.target.value as AgendaStatus)} value={form.status}>
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
            {saving ? "Menyimpan..." : event ? "Simpan Perubahan" : "Tambah Acara"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Halaman daftar ----------

export function AgendaAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<AgendaStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<AdminAgendaEvent | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, category, status]);

  const categories = useApi("agenda-admin-categories", agendaAdminApi.categories);
  const list = useApi(`agenda-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    agendaAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status }),
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  async function togglePublish(event: AdminAgendaEvent) {
    setActionError(null);
    try {
      await agendaAdminApi.update(event.id, { status: event.status === "published" ? "draft" : "published" });
      setNotice(event.status === "published" ? "Acara dikembalikan ke draft." : "Acara dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(event: AdminAgendaEvent) {
    if (!window.confirm(`Hapus acara "${event.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await agendaAdminApi.remove(event.id);
      setNotice("Acara dihapus.");
      // Jika yang dihapus adalah satu-satunya item di halaman terakhir, mundur satu halaman.
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
          <h1 className="aa-title">Agenda Acara</h1>
          <p className="aa-subtitle">Kelola acara kampus yang tampil di halaman Kehidupan Kampus. Terpisah dari Kalender Akademik.</p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
          + Tambah Acara
        </button>
      </header>

      <div className="aa-filters">
        <input
          aria-label="Cari judul acara"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul acara..."
          type="search"
          value={searchInput}
        />
        <select aria-label="Filter kategori" onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="">Semua Acara</option>
          {categories.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as AgendaStatus | "")} value={status}>
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
          Memuat acara...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada acara yang cocok. Klik &quot;Tambah Acara&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Acara</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="aa-event-cell">
                      {event.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="aa-thumb" loading="lazy" src={event.imageUrl} />
                      )}
                      <div>
                    <strong>{event.title}</strong>
                    {(event.location || event.startTime) && (
                      <small>{[event.startTime, event.location].filter(Boolean).join(" · ")}</small>
                    )}
                      </div>
                    </div>
                  </td>
                  <td>{event.category.name}</td>
                  <td>
                    {formatDate(event.startDate)}
                    {event.endDate !== event.startDate && <small>s.d. {formatDate(event.endDate)}</small>}
                  </td>
                  <td>
                    <span className={`aa-badge aa-badge-${event.status}`}>{event.status === "published" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="aa-actions">
                    <button className="aa-btn aa-btn-sm" onClick={() => togglePublish(event)} type="button">
                      {event.status === "published" ? "Jadikan Draft" : "Publish"}
                    </button>
                    <button className="aa-btn aa-btn-sm" onClick={() => setEditing(event)} type="button">
                      Ubah
                    </button>
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => remove(event)} type="button">
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
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} acara
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}

      {editing && categories.data && (
        <EventForm
          categories={categories.data}
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(warning) => {
            if (warning) setActionError(warning);
            else setNotice(editing === "new" ? "Acara ditambahkan." : "Perubahan disimpan.");
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}