"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { errorMessage, formatDate } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  KNOWLEDGE_LIMITS,
  assistantKnowledgeAdminApi,
  type AdminKnowledge,
  type KnowledgeInput,
  type KnowledgeStatus,
} from "@/lib/assistant-knowledge-admin-api";
// Gaya dasar (aa-*) ada di app/admin/admin.css; aa-modal-wide & aa-hint ada di berita-admin.css.
import "@/components/admin/berita-terkini/berita-admin.css";
import "./assistant-knowledge-admin.css";

const PAGE_LIMIT = 10;

// Saran kategori. Kategori bebas: admin boleh mengetik kategori baru di formulir.
const SUGGESTED_CATEGORIES = [
  "Profil",
  "Akademik",
  "Program Studi",
  "PMB",
  "Layanan Akademik",
  "Unit dan Bagian",
  "LPM dan LPPM",
  "Kehidupan Kampus",
  "Alumni",
  "Kontak",
  "Panduan Website",
];

// ---------- Util ----------

// Tanggal hari ini (WIB) dalam format YYYY-MM-DD, sama dengan cara backend menilai masa berlaku.
function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

type Validity = "none" | "active" | "soon" | "expired";

function validityOf(validUntil: string | null): Validity {
  if (!validUntil) return "none";
  const today = todayJakarta();
  if (validUntil < today) return "expired";
  const soon = new Date(`${today}T00:00:00+07:00`);
  soon.setDate(soon.getDate() + 30);
  const soonKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(soon);
  return validUntil <= soonKey ? "soon" : "active";
}

// Sama dengan isSafeSourcePath di backend: URL http/https atau path yang diawali satu "/".
function isSafeSourcePath(value: string): boolean {
  if (/\s/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function normalizeKeyword(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

// ---------- Input keyword (chip) ----------

function KeywordsInput({
  value,
  onChange,
  disabled,
  labelledBy,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  labelledBy: string;
}) {
  const [draft, setDraft] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  function commit(raw: string) {
    const parts = raw.split(/[,\n;]/).map(normalizeKeyword).filter(Boolean);
    if (parts.length === 0) return;

    const next = [...value];
    let notice: string | null = null;
    for (const part of parts) {
      if (next.includes(part)) continue;
      if (part.length > KNOWLEDGE_LIMITS.keywordLength) {
        notice = `Keyword maksimal ${KNOWLEDGE_LIMITS.keywordLength} karakter: "${part.slice(0, 20)}..."`;
        continue;
      }
      if (next.length >= KNOWLEDGE_LIMITS.keywordsMax) {
        notice = `Maksimal ${KNOWLEDGE_LIMITS.keywordsMax} keyword.`;
        break;
      }
      next.push(part);
    }
    setWarning(notice);
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <div className="ak-chips">
        {value.map((keyword) => (
          <span className="ak-chip" key={keyword}>
            {keyword}
            <button
              aria-label={`Hapus keyword ${keyword}`}
              disabled={disabled}
              onClick={() => onChange(value.filter((item) => item !== keyword))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-labelledby={labelledBy}
          disabled={disabled}
          onBlur={() => commit(draft)}
          onChange={(e) => {
            const next = e.target.value;
            // Koma langsung memisahkan keyword (juga saat menempel banyak keyword sekaligus).
            if (/[,;\n]/.test(next)) commit(next);
            else setDraft(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length === 0 ? "Ketik keyword lalu tekan Enter atau koma" : ""}
          value={draft}
        />
      </div>
      {warning && (
        <p className="aa-hint" role="status">
          {warning}
        </p>
      )}
    </div>
  );
}

// ---------- Formulir tambah / ubah ----------

function KnowledgeForm({
  knowledge,
  detail,
  categories,
  onClose,
  onSaved,
}: {
  knowledge: AdminKnowledge | null; // null = knowledge baru
  detail: AdminKnowledge | null; // detail lengkap (memuat content) saat mengubah
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const source = detail ?? knowledge;
  const [title, setTitle] = useState(source?.title ?? "");
  const [category, setCategory] = useState(source?.category ?? "");
  const [status, setStatus] = useState<KnowledgeStatus>(source?.status ?? "published");
  const [content, setContent] = useState(detail?.content ?? "");
  const [keywords, setKeywords] = useState<string[]>(source?.keywords ?? []);
  const [sourceLabel, setSourceLabel] = useState(source?.sourceLabel ?? "");
  const [sourcePath, setSourcePath] = useState(source?.sourcePath ?? "");
  const [validUntil, setValidUntil] = useState(source?.validUntil ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentLength = content.trim().length;
  const overLimit = contentLength > KNOWLEDGE_LIMITS.content;

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanCategory = category.trim();
    const cleanContent = content.trim();
    const cleanPath = sourcePath.trim();

    if (!cleanTitle) return setError("Judul wajib diisi.");
    if (!cleanCategory) return setError("Kategori wajib diisi.");
    if (!cleanContent) return setError("Isi knowledge wajib diisi.");
    if (overLimit) return setError(`Isi knowledge maksimal ${KNOWLEDGE_LIMITS.content.toLocaleString("id-ID")} karakter.`);
    if (cleanPath && !isSafeSourcePath(cleanPath)) {
      return setError("Sumber harus berupa URL http/https atau path yang diawali satu '/', contoh: /pmb/jalur-rpl.");
    }

    // Keyword yang masih diketik (belum Enter) ikut disimpan lewat onBlur; di sini hanya memakai state terkini.
    const input: KnowledgeInput = {
      title: cleanTitle,
      category: cleanCategory,
      content: cleanContent,
      keywords,
      sourceLabel: sourceLabel.trim() || null,
      sourcePath: cleanPath || null,
      status,
      validUntil: validUntil || null,
    };

    setSaving(true);
    try {
      if (knowledge) await assistantKnowledgeAdminApi.update(knowledge.id, input);
      else await assistantKnowledgeAdminApi.create(input);
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
          {knowledge ? "Ubah Knowledge" : "Tambah Knowledge"}
        </h2>

        <label className="aa-field">
          <span>Judul *</span>
          <input
            maxLength={KNOWLEDGE_LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Syarat Jalur RPL"
            required
            value={title}
          />
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>Kategori *</span>
            <input
              list={`${uid}-categories`}
              maxLength={KNOWLEDGE_LIMITS.category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Pilih atau ketik kategori baru"
              required
              value={category}
            />
            <datalist id={`${uid}-categories`}>
              {categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="aa-field">
            <span>Status</span>
            <select onChange={(e) => setStatus(e.target.value as KnowledgeStatus)} value={status}>
              <option value="published">Published (dipakai AI Assistant)</option>
              <option value="draft">Draft (belum dipakai)</option>
            </select>
          </label>
        </div>

        <div className="aa-field">
          <label htmlFor={`${uid}-content`}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Isi knowledge *</span>{" "}
            <small className="aa-hint">— tulis fakta resmi dengan kalimat jelas. AI hanya menjawab dari isi ini.</small>
          </label>
          <textarea
            className="ak-textarea"
            disabled={saving}
            id={`${uid}-content`}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis informasi resmi di sini. Jangan mengisi data pribadi atau informasi yang belum pasti."
            required
            value={content}
          />
          <span className={`ak-counter${overLimit ? " is-over" : ""}`}>
            {contentLength.toLocaleString("id-ID")} / {KNOWLEDGE_LIMITS.content.toLocaleString("id-ID")} karakter
          </span>
        </div>

        <div className="aa-field">
          <span id={`${uid}-keywords`}>
            Keyword{" "}
            <small className="aa-hint">
              (maks. {KNOWLEDGE_LIMITS.keywordsMax}; tambahkan kata sehari-hari, singkatan, dan salah ketik umum agar mudah ditemukan)
            </small>
          </span>
          <KeywordsInput disabled={saving} labelledBy={`${uid}-keywords`} onChange={setKeywords} value={keywords} />
        </div>

        <div className="aa-row">
          <label className="aa-field">
            <span>
              Label sumber <small className="aa-hint">(opsional)</small>
            </span>
            <input
              maxLength={KNOWLEDGE_LIMITS.sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="Contoh: Halaman Jalur RPL"
              value={sourceLabel}
            />
          </label>
          <label className="aa-field">
            <span>
              Path / URL sumber <small className="aa-hint">(opsional)</small>
            </span>
            <input
              maxLength={KNOWLEDGE_LIMITS.sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="/pmb/jalur-rpl"
              value={sourcePath}
            />
          </label>
        </div>

        <div className="aa-field">
          <label htmlFor={`${uid}-valid`}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Berlaku sampai</span>{" "}
            <small className="aa-hint">— kosongkan jika tidak ada batas. Setelah tanggal ini, AI berhenti memakai knowledge ini.</small>
          </label>
          <input id={`${uid}-valid`} onChange={(e) => setValidUntil(e.target.value)} type="date" value={validUntil} />
          {validUntil && (
            <button className="aa-btn aa-btn-sm ak-clear" onClick={() => setValidUntil("")} type="button">
              Hapus tanggal
            </button>
          )}
        </div>

        {error && (
          <p className="aa-error" role="alert">
            {error}
          </p>
        )}

        <div className="aa-modal-actions">
          <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={saving || overLimit} type="submit">
            {saving ? "Menyimpan..." : knowledge ? "Simpan Perubahan" : "Tambah Knowledge"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Saat mengubah, isi knowledge (content) hanya ada di endpoint detail, jadi dimuat dulu sebelum formulir tampil.
function KnowledgeFormLoader({
  knowledge,
  categories,
  onClose,
  onSaved,
}: {
  knowledge: AdminKnowledge | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const detail = useApi(`assistant-knowledge-detail:${knowledge?.id ?? "new"}`, () =>
    knowledge ? assistantKnowledgeAdminApi.detail(knowledge.id) : Promise.resolve(null),
  );

  if (knowledge && (detail.loading || detail.error)) {
    return (
      <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div aria-label="Memuat knowledge" aria-modal="true" className="aa-modal aa-modal-wide" role="dialog">
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
              Memuat isi knowledge...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <KnowledgeForm
      categories={categories}
      detail={detail.data ?? null}
      knowledge={knowledge}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// ---------- Halaman daftar ----------

export function AssistantKnowledgeAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<KnowledgeStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<AdminKnowledge | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seenCategories, setSeenCategories] = useState<string[]>([]);

  useEffect(() => setPage(1), [search, category, status]);

  const list = useApi(`assistant-knowledge-admin:${page}:${search}:${category}:${status}:${refresh}`, () =>
    assistantKnowledgeAdminApi.list({ page, limit: PAGE_LIMIT, search, category, status }),
  );

  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const reload = () => setRefresh((n) => n + 1);

  // Kategori yang pernah muncul di daftar ikut menjadi saran, supaya kategori baru buatan admin tetap bisa dipilih/difilter.
  useEffect(() => {
    if (!list.data) return;
    const found = list.data.items.map((item) => item.category);
    setSeenCategories((current) => {
      const merged = new Set([...current, ...found]);
      return merged.size === current.length ? current : [...merged];
    });
  }, [list.data]);

  const categories = useMemo(
    () => [...new Set([...SUGGESTED_CATEGORIES, ...seenCategories])].sort((a, b) => a.localeCompare(b, "id")),
    [seenCategories],
  );

  async function togglePublish(item: AdminKnowledge) {
    setActionError(null);
    try {
      await assistantKnowledgeAdminApi.update(item.id, { status: item.status === "published" ? "draft" : "published" });
      setNotice(item.status === "published" ? "Knowledge dikembalikan ke draft." : "Knowledge dipublikasikan.");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(item: AdminKnowledge) {
    if (!window.confirm(`Hapus knowledge "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await assistantKnowledgeAdminApi.remove(item.id);
      setNotice("Knowledge dihapus.");
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
          <h1 className="aa-title">Knowledge AI Assistant</h1>
          <p className="aa-subtitle">Kelola informasi resmi yang menjadi sumber jawaban AI Assistant di website.</p>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
          + Tambah Knowledge
        </button>
      </header>

      <p className="ak-info">
        <strong>Cara kerja:</strong> AI hanya memakai knowledge berstatus <strong>Published</strong> yang belum melewati tanggal
        &quot;Berlaku sampai&quot;. Berita, pengumuman, kalender akademik, dan akreditasi dibaca otomatis dari modulnya masing-masing,
        jadi <strong>tidak perlu</strong> ditulis ulang di sini. Jangan memasukkan data pribadi atau informasi yang belum pasti.
      </p>

      <div className="aa-filters ak-filters">
        <input
          aria-label="Cari judul knowledge"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul knowledge..."
          type="search"
          value={searchInput}
        />
        <select aria-label="Filter kategori" onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="">Semua kategori</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as KnowledgeStatus | "")} value={status}>
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
          Memuat knowledge...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Belum ada knowledge yang cocok. Klik &quot;Tambah Knowledge&quot; untuk membuat yang pertama.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Knowledge</th>
                <th>Kategori</th>
                <th>Berlaku sampai</th>
                <th>Status</th>
                <th>Diperbarui</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const validity = validityOf(item.validUntil);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="ak-title-cell">
                        <strong>{item.title}</strong>
                        {item.keywords.length > 0 && (
                          <small>
                            {item.keywords.slice(0, 5).join(", ")}
                            {item.keywords.length > 5 ? ` +${item.keywords.length - 5}` : ""}
                          </small>
                        )}
                        {item.sourcePath && item.sourcePath.startsWith("/") && (
                          <Link className="aa-link" href={item.sourcePath} rel="noopener" target="_blank">
                            {item.sourceLabel || item.sourcePath}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>
                      {item.validUntil ? formatDate(item.validUntil) : "Tanpa batas"}
                      {validity === "expired" && (
                        <>
                          {" "}
                          <span className="aa-badge ak-badge-expired">Kedaluwarsa</span>
                        </>
                      )}
                      {validity === "soon" && (
                        <>
                          {" "}
                          <span className="aa-badge ak-badge-soon">Segera berakhir</span>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`aa-badge aa-badge-${item.status}`}>{item.status === "published" ? "Published" : "Draft"}</span>
                    </td>
                    <td>
                      {formatDate(item.updatedAt)}
                      {(item.updatedBy?.name || item.createdBy?.name) && (
                        <small style={{ display: "block" }}>Oleh {item.updatedBy?.name ?? item.createdBy?.name}</small>
                      )}
                    </td>
                    <td className="aa-actions">
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
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} knowledge
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}

      {editing && (
        <KnowledgeFormLoader
          categories={categories}
          knowledge={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(editing === "new" ? "Knowledge ditambahkan." : "Perubahan disimpan.");
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
