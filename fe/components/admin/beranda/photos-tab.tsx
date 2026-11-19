"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { errorMessage } from "@/lib/api";
import type { HomepagePlacement } from "@/lib/homepage-api";
import { homepageAdminApi, type AdminHomepagePhoto, type PublishStatus } from "@/lib/homepage-admin-api";
import { ConfirmDelete, INPUT_STYLE, ModalFrame, StatusRadios, TextField, formatFileSize } from "./shared";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const PLACEMENTS: { value: HomepagePlacement; label: string; hint: string }[] = [
  { value: "hero", label: "Hero (latar paling atas)", hint: "Gambar latar bagian hero. Disarankan landscape, min. 1600 px." },
  { value: "about", label: "Tentang Universitas LIA", hint: "Gambar di samping teks 'Tentang Universitas LIA'." },
  { value: "campus_life", label: "Kehidupan Kampus", hint: "Foto di bagian 'Kehidupan Kampus'." },
];

const placementLabel = (p: HomepagePlacement) => PLACEMENTS.find((x) => x.value === p)?.label ?? p;

function validateImage(file: File | null): string | null {
  if (!file) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return "Format foto harus JPG, PNG, atau WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Ukuran foto maksimal 5 MB.";
  return null;
}

function PhotoModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminHomepagePhoto | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [placement, setPlacement] = useState<HomepagePlacement>(item?.placement ?? "hero");
  const [title, setTitle] = useState(item?.title ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [sortOrder, setSortOrder] = useState<number>(item?.sortOrder ?? 0);
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? (removeImage ? null : item?.imageUrl ?? null);
  const hint = PLACEMENTS.find((p) => p.value === placement)?.hint;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Judul foto wajib diisi.");
    const imageError = validateImage(file);
    if (imageError) return setError(imageError);

    setSaving(true);
    setError(null);

    const fields = { placement, title: title.trim(), caption: caption.trim(), sortOrder: Number(sortOrder) || 0 };
    let id = item?.id ?? null;

    try {
      if (item) {
        setStep("Memperbarui data...");
        await homepageAdminApi.updatePhoto(item.id, { ...fields, status });
      } else {
        setStep("Menyimpan data...");
        // Draf dulu; dipublikasikan setelah foto berhasil diunggah.
        const created = await homepageAdminApi.createPhoto({ ...fields, status: file ? "draft" : status });
        id = created.id;
      }

      if (id && file) {
        setStep("Mengunggah foto...");
        try {
          await homepageAdminApi.uploadPhotoImage(id, file);
        } catch (uploadErr) {
          onSaved(`Data foto tersimpan, tetapi gambar gagal diunggah: ${errorMessage(uploadErr)} Silakan unggah ulang dari daftar.`);
          onClose();
          return;
        }
        if (!item && status === "published") {
          setStep("Mempublikasikan...");
          await homepageAdminApi.updatePhoto(id, { status: "published" });
        }
      } else if (id && item && removeImage && item.imageUrl) {
        setStep("Menghapus gambar...");
        await homepageAdminApi.removePhotoImage(id);
      }

      onSaved(item ? "Foto berhasil diperbarui." : "Foto baru berhasil ditambahkan.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setStep("");
    }
  }

  return (
    <ModalFrame onClose={onClose} title={item ? "Edit Foto Beranda" : "Tambah Foto Beranda"}>
      <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <p className="aa-error">{error}</p>}

        <div className="aa-field">
          <span>
            <label htmlFor={`${uid}-placement`}>Letak foto</label>
          </span>
          <select id={`${uid}-placement`} onChange={(e) => setPlacement(e.target.value as HomepagePlacement)} style={INPUT_STYLE} value={placement}>
            {PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {hint && <small style={{ color: "var(--admin-muted)", fontSize: 11.5 }}>{hint}</small>}
        </div>

        <TextField label="Judul foto *" max={150} onChange={setTitle} value={title} />
        <TextField label="Keterangan (opsional)" max={300} onChange={setCaption} value={caption} />

        <div className="aa-field" style={{ maxWidth: 160 }}>
          <span>
            <label htmlFor={`${uid}-sort`}>Urutan</label>
          </span>
          <input id={`${uid}-sort`} max={9999} min={0} onChange={(e) => setSortOrder(Number(e.target.value))} type="number" value={sortOrder} />
          <small style={{ color: "var(--admin-muted)", fontSize: 11.5 }}>Angka terkecil yang dipublikasikan yang ditampilkan.</small>
        </div>

        <div className="aa-image-box">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Pratinjau foto" className="aa-image-preview" src={shown} />
          ) : (
            <div className="aa-image-empty">Belum ada foto</div>
          )}
          <div className="aa-image-actions">
            <input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveImage(false); }} type="file" />
            <small>JPG, PNG, atau WebP — maks. 5 MB{file ? ` · dipilih: ${file.name} (${formatFileSize(file.size)})` : ""}</small>
            {item?.imageUrl && !file && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <input checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} type="checkbox" />
                Hapus foto saat ini
              </label>
            )}
          </div>
        </div>

        <StatusRadios onChange={setStatus} value={status} />
        {status === "published" && !shown && (
          <small style={{ color: "#b45309" }}>Foto tanpa gambar tidak tampil di beranda.</small>
        )}

        <div className="aa-modal-actions" style={{ marginTop: 8 }}>
          <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
            {saving ? step || "Menyimpan..." : item ? "Simpan Perubahan" : "Simpan"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function PhotosTab({ onNotice }: { onNotice: (msg: string) => void }) {
  const [items, setItems] = useState<AdminHomepagePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState<"" | HomepagePlacement>("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminHomepagePhoto | null>(null);
  const [deleting, setDeleting] = useState<AdminHomepagePhoto | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    homepageAdminApi
      .listPhotos()
      .then((res) => active && setItems(res))
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reload]);

  const visible = useMemo(() => (filter ? items.filter((i) => i.placement === filter) : items), [items, filter]);

  function saved(msg: string) {
    onNotice(msg);
    setReload((k) => k + 1);
  }

  async function toggle(item: AdminHomepagePhoto) {
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await homepageAdminApi.updatePhoto(item.id, { status: next });
      saved(next === "published" ? "Foto dipublikasikan." : "Foto diubah ke Draf.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await homepageAdminApi.deletePhoto(deleting.id);
      setDeleting(null);
      saved("Foto berhasil dihapus.");
    } catch (err) {
      setDelError(errorMessage(err));
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Filter letak foto" onChange={(e) => setFilter(e.target.value as "" | HomepagePlacement)} style={{ ...INPUT_STYLE, width: 260 }} value={filter}>
          <option value="">Semua letak foto</option>
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button className="aa-btn aa-btn-primary" onClick={() => setCreating(true)} type="button">
          + Tambah Foto
        </button>
      </section>

      {error && <p className="aa-error">{error}</p>}

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Foto</th>
              <th>Judul</th>
              <th style={{ width: 190 }}>Letak</th>
              <th style={{ width: 70, textAlign: "center" }}>Urutan</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat foto...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Belum ada foto.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>Tanpa foto, beranda memakai ilustrasi bawaan.</p>
                    <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreating(true)} type="button">
                      + Tambah Foto
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={item.title} className="aa-thumb" src={item.imageUrl} />
                    ) : (
                      <span style={{ fontSize: 11, color: "#b45309" }}>Belum ada gambar</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                    {item.caption && <div style={{ color: "var(--admin-muted)", fontSize: 12.5, marginTop: 2 }}>{item.caption}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{placementLabel(item.placement)}</td>
                  <td style={{ textAlign: "center" }}>{item.sortOrder}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span className={`aa-badge ${item.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}>
                        {item.status === "published" ? "Dipublikasikan" : "Draf"}
                      </span>
                      <button className="aa-btn aa-btn-sm" onClick={() => toggle(item)} style={{ fontSize: 11, padding: "2px 6px" }} type="button">
                        {item.status === "published" ? "Jadikan Draf" : "Terbitkan"}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="aa-actions">
                      <button className="aa-btn aa-btn-sm" onClick={() => setEditing(item)} type="button">
                        Edit
                      </button>
                      <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => { setDelError(null); setDeleting(item); }} type="button">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {creating && <PhotoModal item={null} onClose={() => setCreating(false)} onSaved={saved} />}
      {editing && <PhotoModal item={editing} onClose={() => setEditing(null)} onSaved={saved} />}
      {deleting && (
        <ConfirmDelete
          busy={delBusy}
          error={delError}
          message={<>Anda yakin ingin menghapus foto <strong>&ldquo;{deleting.title}&rdquo;</strong>? File gambarnya juga ikut dihapus.</>}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          title="Hapus Foto?"
        />
      )}
    </>
  );
}
