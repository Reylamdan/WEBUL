"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage, formatDate, todayIso, type CalendarCategory } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  academicCalendarAdminApi,
  type AdminCalendarEvent,
  type CalendarEventInput,
  type CalendarStatus,
} from "@/lib/academic-calendar-admin-api";

const PAGE_LIMIT = 10;

const EMPTY_FORM: CalendarEventInput = {
  title: "",
  description: null,
  startDate: "",
  endDate: "",
  category: "",
  status: "draft",
};

function toForm(event: AdminCalendarEvent): CalendarEventInput {
  return {
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    category: event.category.slug,
    status: event.status,
  };
}

function dateRange(event: AdminCalendarEvent): string {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  return end && end !== start ? `${start} – ${end}` : start;
}

// ---------- Modal Tambah / Ubah Agenda Kalender ----------

function EventModal({
  categories,
  event,
  onClose,
  onSaved,
}: {
  categories: CalendarCategory[];
  event: AdminCalendarEvent | null;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<CalendarEventInput>(
    event
      ? toForm(event)
      : {
          ...EMPTY_FORM,
          category: categories[0]?.slug ?? "",
          startDate: todayIso(),
          endDate: todayIso(),
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CalendarEventInput>(key: K, value: CalendarEventInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const optional = (value: string) => (value.trim() === "" ? null : value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.endDate < form.startDate) {
      setError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (event) {
        await academicCalendarAdminApi.update(event.id, form);
        onSaved("Agenda akademik berhasil diperbarui.");
      } else {
        await academicCalendarAdminApi.create(form);
        onSaved("Agenda akademik baru berhasil ditambahkan.");
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {event ? "Ubah Agenda Kalender Akademik" : "Tambah Agenda Kalender Akademik"}
        </h2>

        <label className="aa-field">
          <span>Judul Agenda *</span>
          <input
            maxLength={200}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Contoh: Pengisian Kartu Rencana Studi (KRS), Ujian Tengah Semester (UTS)"
            required
            value={form.title}
          />
        </label>

        <label className="aa-field">
          <span>Kategori Agenda *</span>
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
            <span>Tanggal Mulai *</span>
            <input
              onChange={(e) => {
                const start = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  startDate: start,
                  endDate: prev.endDate < start ? start : prev.endDate,
                }));
              }}
              required
              type="date"
              value={form.startDate}
            />
          </label>

          <label className="aa-field">
            <span>Tanggal Selesai *</span>
            <input
              min={form.startDate}
              onChange={(e) => set("endDate", e.target.value)}
              required
              type="date"
              value={form.endDate}
            />
          </label>
        </div>

        <label className="aa-field">
          <span>Deskripsi / Keterangan Tambahan (Opsional)</span>
          <textarea
            maxLength={2000}
            onChange={(e) => set("description", optional(e.target.value))}
            placeholder="Informasi detail, syarat, atau tata cara pelaksanaan kegiatan..."
            rows={4}
            value={form.description ?? ""}
          />
        </label>

        <label className="aa-field">
          <span>Status Publikasi</span>
          <select onChange={(e) => set("status", e.target.value as CalendarStatus)} value={form.status}>
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
            {saving ? "Menyimpan..." : event ? "Simpan Perubahan" : "Tambah Agenda"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Komponen Utama KalenderAdmin ----------

export function KalenderAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<CalendarStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editingEvent, setEditingEvent] = useState<AdminCalendarEvent | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(todayIso());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  const categories = useApi("calendar-admin-categories", academicCalendarAdminApi.categories);
  const list = useApi(`calendar-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    academicCalendarAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status })
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  async function toggleStatus(event: AdminCalendarEvent) {
    setActionError(null);
    try {
      await academicCalendarAdminApi.update(event.id, {
        status: event.status === "published" ? "draft" : "published",
      });
      setNotice(event.status === "published" ? "Agenda dikembalikan ke draft." : "Agenda dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function removeEvent(event: AdminCalendarEvent) {
    if (!window.confirm(`Hapus agenda "${event.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await academicCalendarAdminApi.remove(event.id);
      setNotice(`Agenda "${event.title}" berhasil dihapus.`);
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
          <h1 className="aa-title">Kalender Akademik</h1>
          <p className="aa-subtitle">
            Kelola jadwal kegiatan akademik resmi Universitas LIA (perkuliahan, ujian, registrasi semester, libur akademik, dll).
          </p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditingEvent("new")} type="button">
          + Tambah Agenda
        </button>
      </header>

      {/* Filter Bar */}
      <div className="aa-filters">
        <input
          aria-label="Cari agenda"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul agenda..."
          type="search"
          value={searchInput}
        />
        <select aria-label="Filter kategori" onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="">Semua kategori</option>
          {categories.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as CalendarStatus | "")} value={status}>
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
          Memuat agenda akademik...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada agenda akademik yang cocok. Klik &quot;+ Tambah Agenda&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Jadwal Pelaksanaan</th>
                <th>Agenda &amp; Deskripsi</th>
                <th>Kategori</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((event) => {
                const isOngoing = today && event.startDate <= today && event.endDate >= today;
                return (
                  <tr key={event.id}>
                    <td style={{ minWidth: 160, whiteSpace: "nowrap" }}>
                      <strong>{dateRange(event)}</strong>
                      {isOngoing && (
                        <small style={{ color: "#1b6b35", fontWeight: 600 }}>● Sedang berlangsung</small>
                      )}
                    </td>
                    <td>
                      <strong>{event.title}</strong>
                      {event.description && <small>{event.description}</small>}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          background: "#eef5f8",
                          color: "var(--admin-blue)",
                          fontWeight: 600,
                        }}
                      >
                        {event.category.name}
                      </span>
                    </td>
                    <td>
                      <span className={`aa-badge aa-badge-${event.status}`}>
                        {event.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="aa-actions">
                      <button className="aa-btn aa-btn-sm" onClick={() => toggleStatus(event)} type="button">
                        {event.status === "published" ? "Jadikan Draft" : "Publish"}
                      </button>
                      <button className="aa-btn aa-btn-sm" onClick={() => setEditingEvent(event)} type="button">
                        Ubah
                      </button>
                      <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => removeEvent(event)} type="button">
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} agenda
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

      {editingEvent && categories.data && (
        <EventModal
          categories={categories.data}
          event={editingEvent === "new" ? null : editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={(msg) => {
            setEditingEvent(null);
            if (msg) setNotice(msg);
            reload();
          }}
        />
      )}
    </section>
  );
}

