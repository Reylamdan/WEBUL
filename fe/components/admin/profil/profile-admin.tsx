"use client";

import { useEffect, useId, useRef, useState } from "react";
import { errorMessage, type ProfileContent } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  profileAdminApi,
  type AdminProfileCard,
  type CardStatus,
  type ProfileCardInput,
  type ProfileContentInput,
} from "@/lib/profile-admin-api";

const PAGE_LIMIT = 10;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_CARD_FORM: ProfileCardInput = {
  title: "",
  description: "",
  href: "",
  sortOrder: 0,
  status: "draft",
};

function toCardForm(card: AdminProfileCard): ProfileCardInput {
  return {
    title: card.title,
    description: card.description,
    href: card.href,
    sortOrder: card.sortOrder,
    status: card.status,
  };
}

// ---------- Modal Tambah / Ubah Kartu Jelajahi ----------

function CardModal({
  card,
  onClose,
  onSaved,
}: {
  card: AdminProfileCard | null;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<ProfileCardInput>(card ? toCardForm(card) : EMPTY_CARD_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileCardInput>(key: K, value: ProfileCardInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (card) {
        await profileAdminApi.updateCard(card.id, form);
        onSaved("Kartu berhasil diperbarui.");
      } else {
        await profileAdminApi.createCard(form);
        onSaved("Kartu baru berhasil ditambahkan.");
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
          {card ? "Ubah Kartu Jelajahi Profil" : "Tambah Kartu Jelajahi Profil"}
        </h2>

        <label className="aa-field">
          <span>Judul Kartu *</span>
          <input
            maxLength={150}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Contoh: Sejarah, Visi & Misi"
            required
            value={form.title}
          />
        </label>

        <label className="aa-field">
          <span>Deskripsi Singkat *</span>
          <textarea
            maxLength={500}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Keterangan singkat isi halaman..."
            required
            rows={3}
            value={form.description}
          />
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>Tautan URL (Href) *</span>
            <input
              maxLength={255}
              onChange={(e) => set("href", e.target.value)}
              placeholder="/profil/sejarah"
              required
              value={form.href}
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
          <span>Status Publikasi</span>
          <select onChange={(e) => set("status", e.target.value as CardStatus)} value={form.status}>
            <option value="draft">Draft (hanya terlihat admin)</option>
            <option value="published">Published (tampil di halaman profil)</option>
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
            {saving ? "Menyimpan..." : card ? "Simpan Perubahan" : "Tambah Kartu"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Komponen Utama ProfileAdmin ----------

export function ProfileAdmin() {
  const [activeTab, setActiveTab] = useState<"content" | "cards">("content");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- Tab 1: Konten Halaman Profil ---
  const [refreshContent, setRefreshContent] = useState(0);
  const contentApiData = useApi(`profile-admin-content:${refreshContent}`, profileAdminApi.getContent);
  const reloadContent = () => setRefreshContent((n) => n + 1);
  const [contentForm, setContentForm] = useState<ProfileContentInput>({});
  const [savingContent, setSavingContent] = useState(false);

  // Gambar Hero
  const heroFileInput = useRef<HTMLInputElement>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [removeHero, setRemoveHero] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);

  // Gambar About / Mengenal
  const aboutFileInput = useRef<HTMLInputElement>(null);
  const [aboutFile, setAboutFile] = useState<File | null>(null);
  const [removeAbout, setRemoveAbout] = useState(false);
  const [aboutPreviewUrl, setAboutPreviewUrl] = useState<string | null>(null);
  const [aboutError, setAboutError] = useState<string | null>(null);

  // Inisialisasi formulir konten dari API
  useEffect(() => {
    if (contentApiData.data) {
      const c = contentApiData.data;
      setContentForm({
        heroTitle: c.heroTitle,
        heroSubtitle: c.heroSubtitle,
        aboutEyebrow: c.aboutEyebrow,
        aboutTitle: c.aboutTitle,
        aboutLead: c.aboutLead,
        aboutBody: c.aboutBody,
        exploreEyebrow: c.exploreEyebrow,
        exploreTitle: c.exploreTitle,
        exploreDescription: c.exploreDescription,
        bottomNote: c.bottomNote,
      });
    }
  }, [contentApiData.data]);

  // Preview URL efek
  useEffect(() => {
    if (!heroFile) return setHeroPreviewUrl(null);
    const url = URL.createObjectURL(heroFile);
    setHeroPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [heroFile]);

  useEffect(() => {
    if (!aboutFile) return setAboutPreviewUrl(null);
    const url = URL.createObjectURL(aboutFile);
    setAboutPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [aboutFile]);

  const shownHeroImage = heroPreviewUrl ?? (removeHero ? null : contentApiData.data?.heroImageUrl ?? null);
  const shownAboutImage = aboutPreviewUrl ?? (removeAbout ? null : contentApiData.data?.aboutImageUrl ?? null);

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
    if (contentApiData.data?.heroImageUrl) setRemoveHero(true);
  }

  function pickAboutImage(file: File | undefined) {
    setAboutError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setAboutError("Format harus JPEG, PNG, atau WebP.");
    if (file.size > IMAGE_MAX_BYTES) return setAboutError("Ukuran gambar maksimal 5 MB.");
    setAboutFile(file);
    setRemoveAbout(false);
  }

  function clearAboutImage() {
    setAboutFile(null);
    setAboutError(null);
    if (aboutFileInput.current) aboutFileInput.current.value = "";
    if (contentApiData.data?.aboutImageUrl) setRemoveAbout(true);
  }

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault();
    setSavingContent(true);
    setActionError(null);
    setNotice(null);

    try {
      await profileAdminApi.updateContent(contentForm);

      // Gambar Hero
      if (heroFile) {
        await profileAdminApi.uploadHeroImage(heroFile);
        setHeroFile(null);
      } else if (removeHero && contentApiData.data?.heroImageUrl) {
        await profileAdminApi.removeHeroImage();
        setRemoveHero(false);
      }

      // Gambar About
      if (aboutFile) {
        await profileAdminApi.uploadAboutImage(aboutFile);
        setAboutFile(null);
      } else if (removeAbout && contentApiData.data?.aboutImageUrl) {
        await profileAdminApi.removeAboutImage();
        setRemoveAbout(false);
      }

      setNotice("Konten dan gambar halaman profil berhasil disimpan.");
      reloadContent();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingContent(false);
    }
  }

  // --- Tab 2: Kartu Jelajahi Profil (CRUD) ---
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [status, setStatus] = useState<CardStatus | "">("");
  const [page, setPage] = useState(1);
  const [refreshCards, setRefreshCards] = useState(0);
  const [editingCard, setEditingCard] = useState<AdminProfileCard | "new" | null>(null);

  useEffect(() => setPage(1), [search, status]);

  const cardsList = useApi(`profile-admin-cards:${page}:${search}:${status}:${refreshCards}`, () =>
    profileAdminApi.listCards({ page, limit: PAGE_LIMIT, search, status })
  );

  const cardItems = cardsList.data?.items ?? [];
  const cardPagination = cardsList.data?.pagination;

  async function toggleCardStatus(card: AdminProfileCard) {
    setActionError(null);
    try {
      await profileAdminApi.updateCard(card.id, {
        status: card.status === "published" ? "draft" : "published",
      });
      setNotice(card.status === "published" ? "Kartu dikembalikan ke draft." : "Kartu dipublikasikan.");
      setRefreshCards((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function removeCard(card: AdminProfileCard) {
    if (!window.confirm(`Hapus kartu "${card.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError(null);
    try {
      await profileAdminApi.removeCard(card.id);
      setNotice(`Kartu "${card.title}" berhasil dihapus.`);
      if (cardItems.length === 1 && page > 1) setPage(page - 1);
      else setRefreshCards((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Halaman Profil</h1>
          <p className="aa-subtitle">
            Kelola teks pengantar, gambar pendukung, dan daftar kartu navigasi yang tampil di halaman Profil utama website.
          </p>
        </div>
        {activeTab === "cards" && (
          <button className="aa-btn aa-btn-primary" onClick={() => setEditingCard("new")} type="button">
            + Tambah Kartu
          </button>
        )}
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Profil" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "content" ? "is-active" : ""}`}
          onClick={() => setActiveTab("content")}
          type="button"
        >
          Konten &amp; Media Halaman
        </button>
        <button
          className={`aa-tab ${activeTab === "cards" ? "is-active" : ""}`}
          onClick={() => setActiveTab("cards")}
          type="button"
        >
          Kartu Jelajahi Profil
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

      {/* ================= TAB 1: KONTEN HALAMAN ================= */}
      {activeTab === "content" && (
        <form onSubmit={handleSaveContent} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section 1: Hero */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">1. Bagian Hero (Header Halaman)</h2>

            <label className="aa-field">
              <span>Judul Utama (Hero Title) *</span>
              <input
                maxLength={150}
                onChange={(e) => setContentForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
                placeholder="Profil Universitas LIA"
                required
                value={contentForm.heroTitle ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Subjudul Hero *</span>
              <textarea
                maxLength={500}
                onChange={(e) => setContentForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                placeholder="Mengenal Universitas LIA, perjalanan institusi, nilai..."
                required
                rows={2}
                value={contentForm.heroSubtitle ?? ""}
              />
            </label>

            <div className="aa-field">
              <span>Gambar Hero (Opsional)</span>
              <div className="aa-image-box">
                {shownHeroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Pratinjau hero" className="aa-image-preview" src={shownHeroImage} />
                ) : (
                  <div className="aa-image-empty">Belum ada gambar (menampilkan placeholder default)</div>
                )}
                <div className="aa-image-actions">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Pilih gambar hero"
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

          {/* Section 2: Mengenal / Tentang Kami */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">2. Bagian Mengenal Universitas LIA (Tentang Kami)</h2>

            <div className="aa-row">
              <label className="aa-field" style={{ maxWidth: 220 }}>
                <span>Eyebrow (Label Kecil) *</span>
                <input
                  maxLength={100}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, aboutEyebrow: e.target.value }))}
                  placeholder="TENTANG KAMI"
                  required
                  value={contentForm.aboutEyebrow ?? ""}
                />
              </label>

              <label className="aa-field">
                <span>Judul Bagian *</span>
                <input
                  maxLength={150}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, aboutTitle: e.target.value }))}
                  placeholder="Mengenal Universitas LIA"
                  required
                  value={contentForm.aboutTitle ?? ""}
                />
              </label>
            </div>

            <label className="aa-field">
              <span>Teks Pengantar / Lead *</span>
              <textarea
                maxLength={500}
                onChange={(e) => setContentForm((prev) => ({ ...prev, aboutLead: e.target.value }))}
                placeholder="Informasi ringkas mengenai identitas, perjalanan, dan komitmen..."
                required
                rows={2}
                value={contentForm.aboutLead ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Deskripsi / Isi Teks Lengkap *</span>
              <textarea
                maxLength={5000}
                onChange={(e) => setContentForm((prev) => ({ ...prev, aboutBody: e.target.value }))}
                placeholder="Universitas LIA berkomitmen menghadirkan pengalaman pendidikan..."
                required
                rows={5}
                value={contentForm.aboutBody ?? ""}
              />
            </label>

            <div className="aa-field">
              <span>Gambar Bagian Mengenal (Opsional)</span>
              <div className="aa-image-box">
                {shownAboutImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Pratinjau tentang kami" className="aa-image-preview" src={shownAboutImage} />
                ) : (
                  <div className="aa-image-empty">Belum ada gambar (menampilkan placeholder default)</div>
                )}
                <div className="aa-image-actions">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Pilih gambar tentang kami"
                    hidden
                    onChange={(e) => pickAboutImage(e.target.files?.[0])}
                    ref={aboutFileInput}
                    type="file"
                  />
                  <button className="aa-btn aa-btn-sm" onClick={() => aboutFileInput.current?.click()} type="button">
                    {shownAboutImage ? "Ganti Gambar" : "Pilih Gambar"}
                  </button>
                  {shownAboutImage && (
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={clearAboutImage} type="button">
                      Hapus Gambar
                    </button>
                  )}
                  <small>JPEG, PNG, atau WebP · maks. 5 MB</small>
                </div>
              </div>
              {aboutError && (
                <p className="aa-error" role="alert">
                  {aboutError}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Pengantar Jelajahi Profil */}
          <div className="aa-card-box">
            <h2 className="aa-section-title">3. Pengantar Bagian Jelajahi Profil</h2>

            <div className="aa-row">
              <label className="aa-field" style={{ maxWidth: 220 }}>
                <span>Eyebrow Jelajahi *</span>
                <input
                  maxLength={100}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, exploreEyebrow: e.target.value }))}
                  placeholder="JELAJAHI PROFIL"
                  required
                  value={contentForm.exploreEyebrow ?? ""}
                />
              </label>

              <label className="aa-field">
                <span>Judul Bagian Jelajahi *</span>
                <input
                  maxLength={150}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, exploreTitle: e.target.value }))}
                  placeholder="Informasi Universitas LIA"
                  required
                  value={contentForm.exploreTitle ?? ""}
                />
              </label>
            </div>

            <label className="aa-field">
              <span>Deskripsi / Subjudul Jelajahi *</span>
              <input
                maxLength={500}
                onChange={(e) => setContentForm((prev) => ({ ...prev, exploreDescription: e.target.value }))}
                placeholder="Pilih bagian profil untuk melihat informasi lebih lanjut."
                required
                value={contentForm.exploreDescription ?? ""}
              />
            </label>

            <label className="aa-field">
              <span>Catatan Bawah (Bottom Note) *</span>
              <input
                maxLength={500}
                onChange={(e) => setContentForm((prev) => ({ ...prev, bottomNote: e.target.value }))}
                placeholder="Konten dan foto pendukung dapat ditambahkan setelah materi resmi tersedia."
                required
                value={contentForm.bottomNote ?? ""}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="aa-btn aa-btn-primary" disabled={savingContent} style={{ padding: "12px 24px" }} type="submit">
              {savingContent ? "Menyimpan Perubahan..." : "Simpan Perubahan Konten Halaman"}
            </button>
          </div>
        </form>
      )}

      {/* ================= TAB 2: KARTU JELAJAHI PROFIL (CRUD) ================= */}
      {activeTab === "cards" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari kartu profil"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul kartu..."
              type="search"
              value={searchInput}
            />
            <select aria-label="Filter status" onChange={(e) => setStatus(e.target.value as CardStatus | "")} value={status}>
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {cardsList.error && !cardsList.data ? (
            <p className="aa-error" role="alert">
              {errorMessage(cardsList.error)}
            </p>
          ) : cardsList.loading && !cardsList.data ? (
            <p aria-live="polite" className="aa-empty">
              Memuat data kartu...
            </p>
          ) : cardItems.length === 0 ? (
            <p className="aa-empty">Belum ada kartu profil. Klik &quot;+ Tambah Kartu&quot; untuk membuat kartu pertama.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Judul &amp; Deskripsi</th>
                    <th>Tautan (URL)</th>
                    <th>Urutan</th>
                    <th>Status</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {cardItems.map((card) => (
                    <tr key={card.id}>
                      <td>
                        <strong>{card.title}</strong>
                        <small>{card.description}</small>
                      </td>
                      <td>
                        <code style={{ fontSize: 12.5, color: "var(--admin-blue)" }}>{card.href}</code>
                      </td>
                      <td>{card.sortOrder}</td>
                      <td>
                        <span className={`aa-badge aa-badge-${card.status}`}>
                          {card.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="aa-actions">
                        <button className="aa-btn aa-btn-sm" onClick={() => toggleCardStatus(card)} type="button">
                          {card.status === "published" ? "Jadikan Draft" : "Publish"}
                        </button>
                        <button className="aa-btn aa-btn-sm" onClick={() => setEditingCard(card)} type="button">
                          Ubah
                        </button>
                        <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => removeCard(card)} type="button">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cardPagination && cardPagination.totalPages > 1 && (
            <nav aria-label="Halaman" className="aa-pagination">
              <button className="aa-btn aa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">
                Sebelumnya
              </button>
              <span>
                Halaman {cardPagination.page} dari {cardPagination.totalPages} · {cardPagination.total} kartu
              </span>
              <button
                className="aa-btn aa-btn-sm"
                disabled={page >= cardPagination.totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Selanjutnya
              </button>
            </nav>
          )}

          {editingCard && (
            <CardModal
              card={editingCard === "new" ? null : editingCard}
              onClose={() => setEditingCard(null)}
              onSaved={(msg) => {
                setEditingCard(null);
                if (msg) setNotice(msg);
                setRefreshCards((n) => n + 1);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
