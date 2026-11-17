"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { errorMessage, formatDate, newsApi, resolveApiUrl } from "@/lib/api";
import { newsDetailHref } from "@/lib/content-routes";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import { newsAdminApi, type AdminNews, type NewsStatus, type NewsUpdateInput } from "@/lib/news-admin-api";
import "./berita-admin.css";

const PAGE_LIMIT = 10;
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LINK_PATTERN = /^(https?:\/\/|mailto:|tel:)/i;

// ---------- Editor isi berita ----------
// Backend hanya menerima HTML terbatas (p, h2-h4, strong/b, em/i, ul/ol/li, blockquote, a, br) dan
// membersihkan sisanya. Editor ini hanya membuat tag-tag itu, lalu `normalizeHtml` merapikan hasilnya.

const INLINE_TAGS = new Set(["STRONG", "B", "EM", "I", "A", "BR", "SPAN"]);

function normalizeHtml(raw: string): string {
  const source = document.createElement("div");
  source.innerHTML = raw;
  const out = document.createElement("div");
  let loose: HTMLParagraphElement | null = null;

  for (const node of Array.from(source.childNodes)) {
    const isText = node.nodeType === Node.TEXT_NODE;
    const isInline = node instanceof HTMLElement && INLINE_TAGS.has(node.tagName);

    // Teks/tag inline yang berada langsung di akar dibungkus <p> agar paragrafnya tidak hilang.
    if (isText || isInline) {
      if (isText && !(node.textContent ?? "").trim() && !loose) continue;
      if (!loose) {
        loose = document.createElement("p");
        out.appendChild(loose);
      }
      loose.appendChild(node.cloneNode(true));
      continue;
    }

    loose = null;
    if (node instanceof HTMLElement && node.tagName === "DIV") {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = node.innerHTML;
      out.appendChild(paragraph);
    } else {
      out.appendChild(node.cloneNode(true));
    }
  }

  // Paragraf kosong (hasil menekan Enter berulang) dibuang.
  out.querySelectorAll("p").forEach((p) => {
    if (!(p.textContent ?? "").trim()) p.remove();
  });
  return out.innerHTML.trim();
}

function hasText(html: string): boolean {
  const box = document.createElement("div");
  box.innerHTML = html;
  return (box.textContent ?? "").trim().length > 0;
}

type Tool = { label: string; title: string; run: (exec: (command: string, value?: string) => void) => void };

const TOOLS: Tool[] = [
  { label: "B", title: "Tebal", run: (exec) => exec("bold") },
  { label: "I", title: "Miring", run: (exec) => exec("italic") },
  { label: "H2", title: "Judul bagian", run: (exec) => exec("formatBlock", "<h2>") },
  { label: "H3", title: "Sub judul", run: (exec) => exec("formatBlock", "<h3>") },
  { label: "P", title: "Paragraf biasa", run: (exec) => exec("formatBlock", "<p>") },
  { label: "• Daftar", title: "Daftar poin", run: (exec) => exec("insertUnorderedList") },
  { label: "1. Daftar", title: "Daftar bernomor", run: (exec) => exec("insertOrderedList") },
  { label: "Kutipan", title: "Kutipan", run: (exec) => exec("formatBlock", "<blockquote>") },
  {
    label: "Tautan",
    title: "Tambah tautan pada teks terpilih",
    run: (exec) => {
      const url = window.prompt("Alamat tautan (diawali https://, mailto: atau tel:)");
      if (!url) return;
      if (!LINK_PATTERN.test(url.trim())) {
        window.alert("Tautan harus diawali https://, http://, mailto: atau tel:.");
        return;
      }
      exec("createLink", url.trim());
    },
  },
  { label: "Hapus format", title: "Hapus format teks terpilih", run: (exec) => exec("removeFormat") },
];

function RichTextEditor({
  initialHtml,
  onChange,
  disabled,
  labelledBy,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  disabled: boolean;
  labelledBy: string;
}) {
  const area = useRef<HTMLDivElement>(null);

  // Isi awal dipasang sekali. Setelah itu DOM editor yang menjadi sumber kebenaran (uncontrolled),
  // supaya posisi kursor tidak melompat. initialHtml berasal dari backend yang sudah disanitasi.
  useEffect(() => {
    if (area.current) area.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => onChange(area.current?.innerHTML ?? ""), [onChange]);

  const exec = useCallback(
    (command: string, value?: string) => {
      area.current?.focus();
      document.execCommand(command, false, value);
      emit();
    },
    [emit],
  );

  function handleFocus() {
    // Enter membuat <p>, bukan <div>.
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, "false");
  }

  // Tempel selalu sebagai teks polos agar format/atribut dari Word atau web tidak ikut masuk.
  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  return (
    <div className="bt-editor">
      <div aria-label="Format teks" className="bt-toolbar" role="toolbar">
        {TOOLS.map((tool) => (
          <button
            className="bt-tool"
            disabled={disabled}
            key={tool.label}
            // mouseDown dicegah supaya teks yang terpilih tidak kehilangan fokus saat tombol ditekan.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => tool.run(exec)}
            title={tool.title}
            type="button"
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={labelledBy}
        aria-multiline="true"
        className="bt-area"
        contentEditable={!disabled}
        data-placeholder="Tulis isi berita di sini..."
        onFocus={handleFocus}
        onInput={emit}
        onPaste={handlePaste}
        ref={area}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}

// ---------- Formulir tambah / ubah ----------

function NewsForm({
  categories,
  news,
  detail,
  onClose,
  onSaved,
}: {
  categories: string[];
  news: AdminNews | null; // null = berita baru
  detail: AdminNews | null; // detail lengkap (memuat contentHtml) saat mengubah
  onClose: () => void;
  onSaved: (warning?: string) => void;
}) {
  const uid = useId();
  const source = detail ?? news;
  const [title, setTitle] = useState(source?.title ?? "");
  const [excerpt, setExcerpt] = useState(source?.excerpt ?? "");
  const [category, setCategory] = useState<string>(source?.category ?? "");
  const [status, setStatus] = useState<NewsStatus>(source?.status ?? "draft");
  const [slug, setSlug] = useState(source?.slug ?? "");
  const [contentHtml, setContentHtml] = useState(detail?.contentHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cover opsional: file baru (belum diunggah) atau tandai cover lama untuk dihapus.
  const fileInput = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!coverFile) return setPreviewUrl(null);
    const url = URL.createObjectURL(coverFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const currentCover = resolveApiUrl(news?.coverImageUrl);
  const shownCover = previewUrl ?? (removeCover ? null : currentCover);

  function pickCover(file: File | undefined) {
    setCoverError(null);
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) return setCoverError("Format harus JPEG, PNG, atau WebP.");
    if (file.size > COVER_MAX_BYTES) return setCoverError("Ukuran gambar maksimal 5 MB.");
    setCoverFile(file);
    setRemoveCover(false);
  }

  function clearCover() {
    setCoverFile(null);
    setCoverError(null);
    if (fileInput.current) fileInput.current.value = "";
    if (currentCover) setRemoveCover(true);
  }

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setError(null);

    const html = normalizeHtml(contentHtml);
    if (!hasText(html)) return setError("Isi berita wajib diisi.");

    setSaving(true);
    try {
      const base = {
        title: title.trim(),
        contentHtml: html,
        excerpt: excerpt.trim(),
        category: category || null,
        status,
      };

      let saved: AdminNews;
      if (news) {
        const input: NewsUpdateInput = { ...base };
        const cleanSlug = slug.trim().toLowerCase();
        // Slug hanya dikirim bila diubah sengaja (mengubahnya memutus tautan lama).
        if (cleanSlug && cleanSlug !== news.slug) input.slug = cleanSlug;
        saved = await newsAdminApi.update(news.id, input);
      } else {
        saved = await newsAdminApi.create(base);
      }

      // Cover dikirim terpisah setelah data tersimpan. Jika gagal, data berita tetap aman.
      try {
        if (coverFile) await newsAdminApi.uploadCover(saved.id, coverFile);
        else if (removeCover && news?.coverImageUrl) await newsAdminApi.removeCover(saved.id);
      } catch (coverErr) {
        onSaved(`Berita tersimpan, tetapi cover gagal diproses: ${errorMessage(coverErr)} Klik "Ubah" untuk mencoba lagi.`);
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
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal aa-modal-wide" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {news ? "Ubah Berita" : "Tambah Berita"}
        </h2>

        <label className="aa-field">
          <span>Judul berita *</span>
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
            <select onChange={(e) => setStatus(e.target.value as NewsStatus)} value={status}>
              <option value="draft">Draft (belum tampil di website)</option>
              <option value="published">Published (tampil di website)</option>
            </select>
          </label>
        </div>

        <div className="aa-field">
          <span id={`${uid}-content`}>Isi berita *</span>
          <RichTextEditor
            disabled={saving}
            initialHtml={detail?.contentHtml ?? ""}
            labelledBy={`${uid}-content`}
            onChange={setContentHtml}
          />
        </div>

        <label className="aa-field">
          <span>
            Ringkasan <small className="aa-hint">(opsional, maks. 500 karakter; kosong = dibuat otomatis dari isi berita)</small>
          </span>
          <textarea maxLength={500} onChange={(e) => setExcerpt(e.target.value)} rows={3} value={excerpt} />
        </label>

        <div className="aa-field">
          <span>Cover berita (opsional)</span>
          <div className="aa-image-box">
            {shownCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Pratinjau cover berita" className="aa-image-preview" src={shownCover} />
            ) : (
              <div className="aa-image-empty">Belum ada cover. Berita akan tampil tanpa gambar.</div>
            )}
            <div className="aa-image-actions">
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih cover berita"
                hidden
                onChange={(e) => pickCover(e.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <button className="aa-btn aa-btn-sm" disabled={saving} onClick={() => fileInput.current?.click()} type="button">
                {shownCover ? "Ganti cover" : "Pilih cover"}
              </button>
              {shownCover && (
                <button className="aa-btn aa-btn-sm aa-btn-danger" disabled={saving} onClick={clearCover} type="button">
                  Hapus cover
                </button>
              )}
              <small>JPEG, PNG, atau WebP · maks. 5 MB · disarankan rasio 16:9</small>
            </div>
          </div>
          {coverError && (
            <p className="aa-error" role="alert">
              {coverError}
            </p>
          )}
        </div>

        {news && (
          <label className="aa-field">
            <span>
              Slug (alamat berita) <small className="aa-hint">— jangan diubah kecuali perlu, tautan lama akan tidak berlaku</small>
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
            {saving ? "Menyimpan..." : news ? "Simpan Perubahan" : "Tambah Berita"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Saat mengubah, isi berita (contentHtml) hanya ada di endpoint detail, jadi dimuat dulu sebelum formulir tampil.
function NewsFormLoader({
  categories,
  news,
  onClose,
  onSaved,
}: {
  categories: string[];
  news: AdminNews | null;
  onClose: () => void;
  onSaved: (warning?: string) => void;
}) {
  const detail = useApi(`news-admin-detail:${news?.id ?? "new"}`, () =>
    news ? newsAdminApi.detail(news.id) : Promise.resolve(null),
  );

  if (news && (detail.loading || detail.error)) {
    return (
      <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div aria-modal="true" className="aa-modal aa-modal-wide" role="dialog" aria-label="Memuat berita">
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
              Memuat isi berita...
            </p>
          )}
        </div>
      </div>
    );
  }

  return <NewsForm categories={categories} detail={detail.data ?? null} news={news} onClose={onClose} onSaved={onSaved} />;
}

// ---------- Halaman daftar ----------

export function BeritaAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<NewsStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<AdminNews | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, category, status]);

  const categories = useApi("news-admin-categories", newsApi.categories);
  const list = useApi(`news-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    newsAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status }),
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  async function togglePublish(news: AdminNews) {
    setActionError(null);
    try {
      await newsAdminApi.update(news.id, { status: news.status === "published" ? "draft" : "published" });
      setNotice(news.status === "published" ? "Berita dikembalikan ke draft." : "Berita dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(news: AdminNews) {
    if (!window.confirm(`Hapus berita "${news.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await newsAdminApi.remove(news.id);
      setNotice("Berita dihapus.");
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
          <h1 className="aa-title">Berita Terkini</h1>
          <p className="aa-subtitle">Kelola berita kampus yang tampil di beranda dan halaman Berita Terkini.</p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
          + Tambah Berita
        </button>
      </header>

      <div className="aa-filters">
        <input
          aria-label="Cari judul berita"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul atau ringkasan berita..."
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
        <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as NewsStatus | "")} value={status}>
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
          Memuat berita...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada berita yang cocok. Klik &quot;Tambah Berita&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Berita</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((news) => {
                const cover = resolveApiUrl(news.coverImageUrl);
                return (
                  <tr key={news.id}>
                    <td>
                      <div className="aa-news-cell">
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="aa-thumb" loading="lazy" src={cover} />
                        )}
                        <div>
                          <strong>{news.title}</strong>
                          {news.author && <small>Oleh {news.author.name}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{news.category ?? "—"}</td>
                    <td>
                      {news.publishedAt ? formatDate(news.publishedAt) : formatDate(news.createdAt)}
                      <small>{news.publishedAt ? "Dipublikasikan" : "Dibuat"}</small>
                    </td>
                    <td>
                      <span className={`aa-badge aa-badge-${news.status}`}>{news.status === "published" ? "Published" : "Draft"}</span>
                    </td>
                    <td className="aa-actions">
                      {news.status === "published" && (
                        <Link className="aa-link" href={newsDetailHref(news.slug)} rel="noopener" target="_blank">
                          Lihat
                        </Link>
                      )}
                      <button className="aa-btn aa-btn-sm" onClick={() => togglePublish(news)} type="button">
                        {news.status === "published" ? "Jadikan Draft" : "Publish"}
                      </button>
                      <button className="aa-btn aa-btn-sm" onClick={() => setEditing(news)} type="button">
                        Ubah
                      </button>
                      <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => remove(news)} type="button">
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
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} berita
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}

      {editing && categories.data && (
        <NewsFormLoader
          categories={categories.data}
          news={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(warning) => {
            if (warning) setActionError(warning);
            else setNotice(editing === "new" ? "Berita ditambahkan." : "Perubahan disimpan.");
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
