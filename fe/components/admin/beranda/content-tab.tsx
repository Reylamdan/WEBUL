"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import type { HomepageContent, HomepageIcon, ProgramColor } from "@/lib/homepage-api";
import { homepageAdminApi, type ContentKey } from "@/lib/homepage-admin-api";
import { INPUT_STYLE, LinkField, TextField } from "./shared";

const ICON_OPTIONS: { value: HomepageIcon; label: string }[] = [
  { value: "graduate", label: "Topi wisuda" },
  { value: "monitor", label: "Monitor" },
  { value: "book", label: "Buku" },
  { value: "file", label: "Dokumen" },
  { value: "globe", label: "Globe" },
  { value: "sparkle", label: "Bintang" },
  { value: "calendar", label: "Kalender" },
  { value: "message", label: "Pesan" },
];

const COLOR_OPTIONS: ProgramColor[] = ["coral", "blue", "yellow", "green", "lavender", "orange"];

// ----- Kartu section: draft lokal + simpan + kembalikan ke bawaan -----
function SectionCard<K extends ContentKey>({
  sectionKey,
  title,
  description,
  value,
  onSaved,
  onNotice,
  children,
}: {
  sectionKey: K;
  title: string;
  description: string;
  value: HomepageContent[K];
  onSaved: (content: HomepageContent, resetKey?: K) => void;
  onNotice: (msg: string) => void;
  children: (draft: HomepageContent[K], setDraft: (next: HomepageContent[K]) => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HomepageContent[K]>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sinkron ketika konten dimuat ulang (mis. setelah reset).
  useEffect(() => setDraft(value), [value]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await homepageAdminApi.saveContent({ [sectionKey]: draft } as Partial<HomepageContent>);
      onSaved(res.content);
      onNotice(`Bagian "${title}" berhasil disimpan.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm(`Kembalikan bagian "${title}" ke teks bawaan?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await homepageAdminApi.resetContent(sectionKey);
      onSaved(res.content, sectionKey);
      onNotice(`Bagian "${title}" dikembalikan ke teks bawaan.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="aa-card-box" style={{ gap: 12 }}>
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
        type="button"
      >
        <span>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--admin-muted)", marginTop: 2 }}>{description}</span>
        </span>
        <span style={{ fontSize: 18 }}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          {error && <p className="aa-error">{error}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children(draft, setDraft)}</div>
          <div className="aa-modal-actions" style={{ justifyContent: "space-between" }}>
            <button className="aa-btn" disabled={busy} onClick={reset} type="button">
              Kembalikan ke bawaan
            </button>
            <button className="aa-btn aa-btn-primary" disabled={busy || !dirty} onClick={save} type="button">
              {busy ? "Menyimpan..." : dirty ? "Simpan Perubahan" : "Tersimpan"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function IconSelect({ value, onChange }: { value: HomepageIcon; onChange: (v: HomepageIcon) => void }) {
  return (
    <div className="aa-field" style={{ maxWidth: 170 }}>
      <span>Ikon</span>
      <select onChange={(e) => onChange(e.target.value as HomepageIcon)} style={INPUT_STYLE} value={value}>
        {ICON_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ItemBox({ children, onRemove, label }: { children: React.ReactNode; onRemove: () => void; label: string }) {
  return (
    <div style={{ border: "1px solid var(--admin-border, #e2e8ed)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={onRemove} type="button">
          Hapus
        </button>
      </div>
      {children}
    </div>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MoveButtons<T>({ list, index, onChange }: { list: T[]; index: number; onChange: (next: T[]) => void }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button aria-label="Naikkan" className="aa-btn aa-btn-sm" disabled={index === 0} onClick={() => onChange(move(list, index, index - 1))} type="button">
        ↑
      </button>
      <button aria-label="Turunkan" className="aa-btn aa-btn-sm" disabled={index === list.length - 1} onClick={() => onChange(move(list, index, index + 1))} type="button">
        ↓
      </button>
    </span>
  );
}

export function ContentTab({ onNotice }: { onNotice: (msg: string) => void }) {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    homepageAdminApi
      .getContent()
      .then((res) => active && setContent(res.content))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="aa-error">{error}</p>;
  if (!content) return <p style={{ color: "var(--admin-muted)", padding: 24 }}>Memuat konten beranda...</p>;

  const common = { onNotice, onSaved: (next: HomepageContent) => setContent(next) };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard {...common} description="Judul besar, deskripsi, dan tombol di bagian paling atas." sectionKey="hero" title="Hero" value={content.hero}>
        {(d, set) => (
          <>
            <div className="aa-row">
              <TextField label="Label kecil (eyebrow)" max={60} onChange={(v) => set({ ...d, eyebrow: v })} value={d.eyebrow} />
              <TextField label="Teks catatan gambar" max={100} onChange={(v) => set({ ...d, imageNote: v })} value={d.imageNote} />
            </div>
            <div className="aa-row">
              <TextField label="Judul baris 1" max={80} onChange={(v) => set({ ...d, titleLine1: v })} value={d.titleLine1} />
              <TextField label="Judul baris 2 (opsional)" max={80} onChange={(v) => set({ ...d, titleLine2: v })} value={d.titleLine2} />
            </div>
            <TextField label="Deskripsi" max={400} multiline onChange={(v) => set({ ...d, description: v })} value={d.description} />
            <TextField label="Keterangan di dekat tombol putar" max={150} onChange={(v) => set({ ...d, caption: v })} value={d.caption} />
            <div className="aa-row">
              <TextField label="Tombol utama — teks" max={60} onChange={(v) => set({ ...d, primaryLabel: v })} value={d.primaryLabel} />
              <LinkField label="Tombol utama — tautan" onChange={(v) => set({ ...d, primaryHref: v })} value={d.primaryHref} />
            </div>
            <div className="aa-row">
              <TextField label="Tautan kedua — teks" max={60} onChange={(v) => set({ ...d, secondaryLabel: v })} value={d.secondaryLabel} />
              <LinkField label="Tautan kedua — tujuan" onChange={(v) => set({ ...d, secondaryHref: v })} value={d.secondaryHref} />
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Judul, ringkasan, dan poin-poin nilai universitas." sectionKey="about" title="Tentang Universitas LIA" value={content.about}>
        {(d, set) => (
          <>
            <div className="aa-row">
              <TextField label="Label kecil (eyebrow)" max={60} onChange={(v) => set({ ...d, eyebrow: v })} value={d.eyebrow} />
              <TextField label="Judul" max={150} onChange={(v) => set({ ...d, title: v })} value={d.title} />
            </div>
            <TextField label="Ringkasan" max={400} multiline onChange={(v) => set({ ...d, lead: v })} value={d.lead} />

            <strong style={{ fontSize: 13 }}>Poin nilai</strong>
            {d.values.map((val, i) => (
              <ItemBox key={i} label={`Poin ${i + 1}`} onRemove={() => set({ ...d, values: d.values.filter((_, k) => k !== i) })}>
                <div className="aa-row">
                  <IconSelect onChange={(icon) => set({ ...d, values: d.values.map((x, k) => (k === i ? { ...x, icon } : x)) })} value={val.icon} />
                  <TextField label="Judul poin" max={80} onChange={(v) => set({ ...d, values: d.values.map((x, k) => (k === i ? { ...x, title: v } : x)) })} value={val.title} />
                </div>
                <TextField label="Keterangan" max={150} onChange={(v) => set({ ...d, values: d.values.map((x, k) => (k === i ? { ...x, description: v } : x)) })} value={val.description} />
              </ItemBox>
            ))}
            {d.values.length < 6 && (
              <button
                className="aa-btn aa-btn-sm"
                onClick={() => set({ ...d, values: [...d.values, { icon: "sparkle", title: "", description: "" }] })}
                style={{ alignSelf: "flex-start" }}
                type="button"
              >
                + Tambah poin
              </button>
            )}

            <div className="aa-row">
              <TextField label="Tautan — teks" max={60} onChange={(v) => set({ ...d, linkLabel: v })} value={d.linkLabel} />
              <LinkField label="Tautan — tujuan" onChange={(v) => set({ ...d, linkHref: v })} value={d.linkHref} />
            </div>
            <div className="aa-row">
              <TextField hint="Tampil di ilustrasi bila belum ada foto" label="Tulisan di ilustrasi" max={100} onChange={(v) => set({ ...d, mediaLabel: v })} value={d.mediaLabel} />
              <TextField label="Keterangan di bawah gambar" max={100} onChange={(v) => set({ ...d, mediaCaption: v })} value={d.mediaCaption} />
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Judul bagian dan kartu program studi." sectionKey="programs" title="Program Studi" value={content.programs}>
        {(d, set) => (
          <>
            <div className="aa-row">
              <TextField label="Label kecil (eyebrow)" max={60} onChange={(v) => set({ ...d, eyebrow: v })} value={d.eyebrow} />
              <TextField label="Judul" max={120} onChange={(v) => set({ ...d, title: v })} value={d.title} />
            </div>
            <TextField label="Kalimat pengantar" max={300} onChange={(v) => set({ ...d, lead: v })} value={d.lead} />
            <div className="aa-row">
              <TextField label="Tautan 'lihat semua' — teks" max={60} onChange={(v) => set({ ...d, linkLabel: v })} value={d.linkLabel} />
              <LinkField label="Tautan 'lihat semua' — tujuan" onChange={(v) => set({ ...d, linkHref: v })} value={d.linkHref} />
            </div>

            <strong style={{ fontSize: 13 }}>Kartu program</strong>
            {d.items.map((item, i) => (
              <ItemBox key={i} label={`Program ${i + 1}${item.title ? ` — ${item.title}` : ""}`} onRemove={() => set({ ...d, items: d.items.filter((_, k) => k !== i) })}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <MoveButtons index={i} list={d.items} onChange={(items) => set({ ...d, items })} />
                </div>
                <div className="aa-row">
                  <TextField label="Fakultas" max={80} onChange={(v) => set({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, eyebrow: v } : x)) })} value={item.eyebrow} />
                  <TextField label="Nama program studi" max={100} onChange={(v) => set({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, title: v } : x)) })} value={item.title} />
                </div>
                <div className="aa-row">
                  <TextField label="Jenjang & durasi" max={60} onChange={(v) => set({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, code: v } : x)) })} value={item.code} />
                  <div className="aa-field" style={{ maxWidth: 170 }}>
                    <span>Warna kartu</span>
                    <select onChange={(e) => set({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, color: e.target.value as ProgramColor } : x)) })} style={INPUT_STYLE} value={item.color}>
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <LinkField label="Tautan" onChange={(v) => set({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, href: v } : x)) })} value={item.href} />
              </ItemBox>
            ))}
            {d.items.length < 12 && (
              <button
                className="aa-btn aa-btn-sm"
                onClick={() => set({ ...d, items: [...d.items, { eyebrow: "", title: "", code: "S1 · 8 semester", color: "blue", href: "/akademik/fakultas" }] })}
                style={{ alignSelf: "flex-start" }}
                type="button"
              >
                + Tambah program
              </button>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Teks di samping foto kehidupan kampus." sectionKey="campusLife" title="Kehidupan Kampus" value={content.campusLife}>
        {(d, set) => (
          <>
            <div className="aa-row">
              <TextField label="Label kecil (eyebrow)" max={60} onChange={(v) => set({ ...d, eyebrow: v })} value={d.eyebrow} />
              <TextField label="Judul" max={150} onChange={(v) => set({ ...d, title: v })} value={d.title} />
            </div>
            <TextField label="Deskripsi" max={400} multiline onChange={(v) => set({ ...d, description: v })} value={d.description} />
            <div className="aa-row">
              <TextField label="Tautan — teks" max={60} onChange={(v) => set({ ...d, linkLabel: v })} value={d.linkLabel} />
              <LinkField label="Tautan — tujuan" onChange={(v) => set({ ...d, linkHref: v })} value={d.linkHref} />
            </div>
            <TextField label="Label pada foto" max={60} onChange={(v) => set({ ...d, photoLabel: v })} value={d.photoLabel} />
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Banner ajakan pendaftaran di bagian bawah beranda." sectionKey="admission" title="Banner PMB" value={content.admission}>
        {(d, set) => (
          <>
            <div className="aa-row">
              <TextField label="Label kecil (eyebrow)" max={60} onChange={(v) => set({ ...d, eyebrow: v })} value={d.eyebrow} />
              <TextField label="Judul" max={150} onChange={(v) => set({ ...d, title: v })} value={d.title} />
            </div>
            <TextField label="Deskripsi" max={400} multiline onChange={(v) => set({ ...d, description: v })} value={d.description} />
            <div className="aa-row">
              <TextField label="Tombol utama — teks" max={60} onChange={(v) => set({ ...d, primaryLabel: v })} value={d.primaryLabel} />
              <LinkField label="Tombol utama — tautan" onChange={(v) => set({ ...d, primaryHref: v })} value={d.primaryHref} />
            </div>
            <div className="aa-row">
              <TextField label="Tautan kedua — teks" max={80} onChange={(v) => set({ ...d, secondaryLabel: v })} value={d.secondaryLabel} />
              <LinkField label="Tautan kedua — tujuan" onChange={(v) => set({ ...d, secondaryHref: v })} value={d.secondaryHref} />
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Pintasan layanan kampus di bagian paling atas (maks. 8)." sectionKey="quickLinks" title="Tautan Cepat Layanan" value={content.quickLinks}>
        {(d, set) => (
          <>
            {d.map((item, i) => (
              <ItemBox key={i} label={`Tautan ${i + 1}${item.name ? ` — ${item.name}` : ""}`} onRemove={() => set(d.filter((_, k) => k !== i))}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <MoveButtons index={i} list={d} onChange={set} />
                </div>
                <div className="aa-row">
                  <IconSelect onChange={(icon) => set(d.map((x, k) => (k === i ? { ...x, icon } : x)))} value={item.icon} />
                  <TextField label="Nama layanan" max={40} onChange={(v) => set(d.map((x, k) => (k === i ? { ...x, name: v } : x)))} value={item.name} />
                  <TextField label="Keterangan" max={80} onChange={(v) => set(d.map((x, k) => (k === i ? { ...x, detail: v } : x)))} value={item.detail} />
                </div>
                <LinkField label="Tautan" onChange={(v) => set(d.map((x, k) => (k === i ? { ...x, href: v } : x)))} value={item.href} />
              </ItemBox>
            ))}
            {d.length < 8 && (
              <button
                className="aa-btn aa-btn-sm"
                onClick={() => set([...d, { name: "", detail: "", icon: "globe", href: "https://" }])}
                style={{ alignSelf: "flex-start" }}
                type="button"
              >
                + Tambah tautan
              </button>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard {...common} description="Judul dan daftar nama mitra (maks. 24)." sectionKey="partners" title="Mitra" value={content.partners}>
        {(d, set) => (
          <>
            <TextField label="Judul bagian" max={80} onChange={(v) => set({ ...d, title: v })} value={d.title} />
            <strong style={{ fontSize: 13 }}>Nama mitra</strong>
            {d.items.map((name, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input maxLength={60} onChange={(e) => set({ ...d, items: d.items.map((x, k) => (k === i ? e.target.value : x)) })} style={INPUT_STYLE} type="text" value={name} />
                <MoveButtons index={i} list={d.items} onChange={(items) => set({ ...d, items })} />
                <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => set({ ...d, items: d.items.filter((_, k) => k !== i) })} type="button">
                  Hapus
                </button>
              </div>
            ))}
            {d.items.length < 24 && (
              <button className="aa-btn aa-btn-sm" onClick={() => set({ ...d, items: [...d.items, ""] })} style={{ alignSelf: "flex-start" }} type="button">
                + Tambah mitra
              </button>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
