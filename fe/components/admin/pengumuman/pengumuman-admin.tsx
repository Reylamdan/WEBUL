"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { announcementApi, errorMessage, formatDate } from "@/lib/api";
import { announcementDetailHref } from "@/lib/content-routes";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  announcementAdminApi,
  type AdminAnnouncement,
  type AnnouncementStatus,
  type AnnouncementUpdateInput,
} from "@/lib/announcement-admin-api";
import { RichTextEditor, hasText, normalizeHtml } from "@/components/admin/rich-text-editor";
// Gaya dasar (aa-*) ada di app/admin/admin.css; tambahan editor & tautan ada di file ini.
import "@/components/admin/berita-terkini/berita-admin.css";

const PAGE_LIMIT = 10;

// ---------- Formulir tambah / ubah ----------

function AnnouncementForm({
  categories,
  announcement,
  detail,
  onClose,
  onSaved,
}: {
  categories: string[];
  announcement: AdminAnnouncement | null; // null = pengumuman baru
  detail: AdminAnnouncement | null; // detail lengkap (memuat contentHtml) saat mengubah
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const source = detail ?? announcement;
  const [title, setTitle] = useState(source?.title ?? "");
  const [excerpt, setExcerpt] = useState(source?.excerpt ?? "");
  const [category, setCategory] = useState<string>(source?.category ?? "");
  const [status, setStatus] = useState<AnnouncementStatus>(source?.status ?? "draft");
  const [slug, setSlug] = useState(source?.slug ?? "");
  const [contentHtml, setContentHtml] = useState(detail?.contentHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setError(null);

    const html = normalizeHtml(contentHtml);
    if (!hasText(html)) return setError("Isi pengumuman wajib diisi.");

    setSaving(true);
    try {
      const base = {
        title: title.trim(),
        contentHtml: html,
        excerpt: excerpt.trim(),
        category: category || null,
        status,
      };

      if (announcement) {
        const input: AnnouncementUpdateInput = { ...base };
        const cleanSlug = slug.trim().toLowerCase();
        // Slug hanya dikirim bila diubah sengaja (mengubahnya memutus tautan lama).
        if (cleanSlug && cleanSlug !== announcement.slug) input.slug = cleanSlug;
        await announcementAdminApi.update(announcement.id, input);
      } else {
        await announcementAdminApi.create(base);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal aa-modal-wide" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {announcement ? "Ubah Pengumuman" : "Tambah Pengumuman"}
        </h2>

        <label className="aa-field">
          <span>Judul pengumuman *</span>
          <input maxLength={200} minLength={3} onChange={(e) => setTitle(e.target.value)} required value={title} />
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>Kategori</span>
            <select onChange={(e) => setCategory(e.target.value)} value={category}>
              <option value="">Tanpa kategori</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="aa-field">
            <span>Status</span>
            <select onChange={(e) => setStatus(e.target.value as AnnouncementStatus)} value={status}>
              <option value="draft">Draft (belum tampil di website)</option>
              <option value="published">Published (tampil di website)</option>
            </select>
          </label>
        </div>

        <div className="aa-field">
          <span id={`${uid}-content`}>Isi pengumuman *</span>
          <RichTextEditor
            disabled={saving}
            initialHtml={detail?.contentHtml ?? ""}
            labelledBy={`${uid}-content`}
            onChange={setContentHtml}
          />
        </div>

        <label className="aa-field">
          <span>
            Ringkasan <small className="aa-hint">(opsional, maks. 500 karakter; kosong = dibuat otomatis dari isi pengumuman)</small>
          </span>
          <textarea maxLength={500} onChange={(e) => setExcerpt(e.target.value)} rows={3} value={excerpt} />
        </label>

        {announcement && (
          <label className="aa-field">
            <span>
              Slug (alamat pengumuman) <small className="aa-hint">— jangan diubah kecuali perlu, tautan lama akan tidak berlaku</small>
            </span>
            <input maxLength={120} onChange={(e) => setSlug(e.target.value)} value={slug} />
          </label>
        )}

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
            {saving ? "Menyimpan..." : announcement ? "Simpan Perubahan" : "Tambah Pengumuman"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Saat mengubah, isi pengumuman (contentHtml) hanya ada di endpoint detail, jadi dimuat dulu sebelum formulir tampil.
function AnnouncementFormLoader({
  categories,
  announcement,
  onClose,
  onSaved,
}: {
  categories: string[];
  announcement: AdminAnnouncement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const detail = useApi(`announcement-admin-detail:${announcement?.id ?? "new"}`, () =>
    announcement ? announcementAdminApi.detail(announcement.id) : Promise.resolve(null),
  );

  if (announcement && (detail.loading || detail.error)) {
    return (
      <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div aria-label="Memuat pengumuman" aria-modal="true" className="aa-modal aa-modal-wide" role="dialog">
          {detail.error ? (
            <>
              <p className="aa-error" role="alert">
                {errorMessage(detail.error)}
              </p>
              <div className="aa-modal-actions">
                <button className="aa-btn" onClick={onClose} type="button">
                  Tutup
                </button>
              </div>
            </>
          ) : (
            <p aria-live="polite" className="aa-empty">
              Memuat isi pengumuman...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AnnouncementForm
      announcement={announcement}
      categories={categories}
      detail={detail.data ?? null}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// ---------- Halaman daftar ----------

export function PengumumanAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<AnnouncementStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<AdminAnnouncement | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, category, status]);

  const categories = useApi("announcement-admin-categories", announcementApi.categories);
  const list = useApi(`announcement-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    announcementAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status }),
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  async function togglePublish(item: AdminAnnouncement) {
    setActionError(null);
    try {
      await announcementAdminApi.update(item.id, { status: item.status === "published" ? "draft" : "published" });
      setNotice(item.status === "published" ? "Pengumuman dikembalikan ke draft." : "Pengumuman dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(item: AdminAnnouncement) {
    if (!window.confirm(`Hapus pengumuman "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await announcementAdminApi.remove(item.id);
      setNotice("Pengumuman dihapus.");
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
          <h1 className="aa-title">Pengumuman</h1>
          <p className="aa-subtitle">Kelola pengumuman kampus yang tampil di beranda dan halaman Pengumuman.</p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
          + Tambah Pengumuman
        </button>
      </header>

      <div className="aa-filters">
        <input
          aria-label="Cari judul pengumuman"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul atau ringkasan pengumuman..."
          type="search"
          value={searchInput}
        />
        <select aria-label="Filter kategori" onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="">Semua kategori</option>
          {categories.data?.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          onChange={(e) => setStatus(e.target.value as AnnouncementStatus | "")}
          value={status}
        >
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
          Memuat pengumuman...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada pengumuman yang cocok. Klik &quot;Tambah Pengumuman&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Pengumuman</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.author && <small>Oleh {item.author.name}</small>}
                  </td>
                  <td>{item.category ?? "—"}</td>
                  <td>
                    {item.publishedAt ? formatDate(item.publishedAt) : formatDate(item.createdAt)}
                    <small>{item.publishedAt ? "Dipublikasikan" : "Dibuat"}</small>
                  </td>
                  <td>
                    <span className={`aa-badge aa-badge-${item.status}`}>{item.status === "published" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="aa-actions">
                    {item.status === "published" && (
                      <Link className="aa-link" href={announcementDetailHref(item.slug)} rel="noopener" target="_blank">
                        Lihat
                      </Link>
                    )}
                    <button className="aa-btn aa-btn-sm" onClick={() => togglePublish(item)} type="button">
                      {item.status === "published" ? "Jadikan Draft" : "Publish"}
                    </button>
                    <button className="aa-btn aa-btn-sm" onClick={() => setEditing(item)} type="button">
                      Ubah
                    </button>
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => remove(item)} type="button">
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
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} pengumuman
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}

      {editing && categories.data && (
        <AnnouncementFormLoader
          announcement={editing === "new" ? null : editing}
          categories={categories.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(editing === "new" ? "Pengumuman ditambahkan." : "Perubahan disimpan.");
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
