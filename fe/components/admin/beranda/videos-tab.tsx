"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { homepageAdminApi, type AdminHomepageVideo, type PublishStatus } from "@/lib/homepage-admin-api";
import { ConfirmDelete, ModalFrame, StatusRadios, TextField, formatFileSize } from "./shared";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function validateVideo(file: File | null): string | null {
  if (!file) return null;
  if (!/\.(mp4|webm)$/i.test(file.name)) return "Format video harus MP4 atau WebM.";
  if (file.size > MAX_VIDEO_BYTES) return "Ukuran video maksimal 50 MB (batas bisa berbeda sesuai pengaturan server).";
  return null;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminHomepageVideo | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState<number>(item?.sortOrder ?? 0);
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Judul video wajib diisi.");
    const fileError = validateVideo(file);
    if (fileError) return setError(fileError);

    setSaving(true);
    setError(null);

    const fields = { title: title.trim(), description: description.trim(), sortOrder: Number(sortOrder) || 0 };
    let id = item?.id ?? null;

    try {
      if (item) {
        setStep("Memperbarui data...");
        await homepageAdminApi.updateVideo(item.id, { ...fields, status });
      } else {
        setStep("Menyimpan data...");
        const created = await homepageAdminApi.createVideo({ ...fields, status: file ? "draft" : status });
        id = created.id;
      }

      if (id && file) {
        setStep("Mengunggah video (bisa beberapa menit)...");
        try {
          await homepageAdminApi.uploadVideoFile(id, file, Boolean(item?.video));
        } catch (uploadErr) {
          onSaved(`Data video tersimpan, tetapi file gagal diunggah: ${errorMessage(uploadErr)} Silakan unggah ulang dari daftar.`);
          onClose();
          return;
        }
        if (!item && status === "published") {
          setStep("Mempublikasikan...");
          await homepageAdminApi.updateVideo(id, { status: "published" });
        }
      } else if (id && item?.video && removeFile) {
        setStep("Menghapus file video...");
        await homepageAdminApi.removeVideoFile(id);
      }

      onSaved(item ? "Video berhasil diperbarui." : "Video baru berhasil ditambahkan.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setStep("");
    }
  }

  const hasVideo = Boolean(item?.video) && !removeFile;

  return (
    <ModalFrame onClose={onClose} title={item ? "Edit Video Beranda" : "Tambah Video Beranda"}>
      <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <p className="aa-error">{error}</p>}

        <TextField label="Judul video *" max={150} onChange={setTitle} value={title} />
        <TextField label="Deskripsi (opsional)" max={500} multiline onChange={setDescription} value={description} />

        <div className="aa-field" style={{ maxWidth: 160 }}>
          <span>Urutan</span>
          <input max={9999} min={0} onChange={(e) => setSortOrder(Number(e.target.value))} type="number" value={sortOrder} />
          <small style={{ color: "var(--admin-muted)", fontSize: 11.5 }}>Video pertama yang dipublikasikan diputar lebih dulu.</small>
        </div>

        <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px dashed var(--admin-line, #cbd5e1)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>File video (MP4 / WebM — disimpan di Cloudinary)</span>
          {hasVideo && item?.video && (
            <video controls poster={item.video.thumbnailUrl ?? undefined} preload="metadata" src={item.video.url} style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000" }} />
          )}
          <input accept=".mp4,.webm,video/mp4,video/webm" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveFile(false); }} type="file" />
          {file && (
            <small style={{ color: "#166534" }}>
              Dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)}){item?.video ? " — akan menggantikan video lama" : ""}
            </small>
          )}
          {item?.video && !file && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              <input checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} type="checkbox" />
              Hapus file video saat ini
            </label>
          )}
        </div>

        <StatusRadios onChange={setStatus} value={status} />
        {status === "published" && !hasVideo && !file && (
          <small style={{ color: "#b45309" }}>Video tanpa file tidak tampil di beranda.</small>
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

export function VideosTab({ onNotice }: { onNotice: (msg: string) => void }) {
  const [items, setItems] = useState<AdminHomepageVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminHomepageVideo | null>(null);
  const [deleting, setDeleting] = useState<AdminHomepageVideo | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    homepageAdminApi
      .listVideos()
      .then((res) => active && setItems(res))
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reload]);

  function saved(msg: string) {
    onNotice(msg);
    setReload((k) => k + 1);
  }

  async function toggle(item: AdminHomepageVideo) {
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await homepageAdminApi.updateVideo(item.id, { status: next });
      saved(next === "published" ? "Video dipublikasikan." : "Video diubah ke Draf.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await homepageAdminApi.deleteVideo(deleting.id);
      setDeleting(null);
      saved("Video berhasil dihapus.");
    } catch (err) {
      setDelError(errorMessage(err));
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>
          Video diputar saat pengunjung menekan tombol putar di bagian hero beranda.
        </p>
        <button className="aa-btn aa-btn-primary" onClick={() => setCreating(true)} type="button">
          + Tambah Video
        </button>
      </section>

      {error && <p className="aa-error">{error}</p>}

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Video</th>
              <th>Judul</th>
              <th style={{ width: 70, textAlign: "center" }}>Urutan</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 150, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat video...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Belum ada video.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>Tanpa video, tombol putar menampilkan pesan &ldquo;segera hadir&rdquo;.</p>
                    <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreating(true)} type="button">
                      + Tambah Video
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.video ? (
                      <div>
                        {item.video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={item.title} className="aa-thumb" src={item.video.thumbnailUrl} />
                        ) : null}
                        <div style={{ fontSize: 11, color: "var(--admin-muted)", marginTop: 3 }}>
                          {(item.video.format || "").toUpperCase()} {formatFileSize(item.video.bytes)} {formatDuration(item.video.duration)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "#b45309" }}>Belum ada file</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                    {item.description && <div style={{ color: "var(--admin-muted)", fontSize: 12.5, marginTop: 2 }}>{item.description}</div>}
                  </td>
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

      {creating && <VideoModal item={null} onClose={() => setCreating(false)} onSaved={saved} />}
      {editing && <VideoModal item={editing} onClose={() => setEditing(null)} onSaved={saved} />}
      {deleting && (
        <ConfirmDelete
          busy={delBusy}
          error={delError}
          message={<>Anda yakin ingin menghapus video <strong>&ldquo;{deleting.title}&rdquo;</strong>? File videonya di Cloudinary juga ikut dihapus.</>}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          title="Hapus Video?"
        />
      )}
    </>
  );
}
