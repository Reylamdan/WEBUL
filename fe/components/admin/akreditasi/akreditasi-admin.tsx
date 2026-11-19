"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { errorMessage, resolveApiUrl, type Paged } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-api";
import { AdminIcon } from "@/components/admin/admin-icons";
import {
  EXPIRY_LABELS,
  institutionAdminApi,
  studyProgramAdminApi,
  type AccreditationDocument,
  type AdminInstitutionAccreditation,
  type AdminStudyProgramAccreditation,
  type ExpiryStatus,
  type InstitutionInput,
  type PublishStatus,
  type StudyProgramInput,
} from "@/lib/accreditation-admin-api";

type Kind = "institution" | "studyProgram";
type AnyItem = AdminInstitutionAccreditation | AdminStudyProgramAccreditation;

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const RANK_SUGGESTIONS = ["Unggul", "Baik Sekali", "Baik", "A", "B", "C"];
const LEVEL_SUGGESTIONS = ["D3", "D4", "S1", "S2", "S3"];

const KIND_LABEL: Record<Kind, string> = {
  institution: "Akreditasi Institusi",
  studyProgram: "Akreditasi Program Studi",
};

// Satu antarmuka untuk dua jenis data; kontrak endpoint keduanya sama.
type AnyApi = {
  list(params: Record<string, string | number | undefined>): Promise<Paged<AnyItem>>;
  create(input: InstitutionInput & StudyProgramInput): Promise<AnyItem>;
  update(id: string, input: InstitutionInput & StudyProgramInput): Promise<AnyItem>;
  remove(id: string): Promise<unknown>;
  uploadDocument(id: string, file: File): Promise<AnyItem>;
  removeDocument(id: string): Promise<AnyItem>;
};

function apiFor(kind: Kind): AnyApi {
  return (kind === "institution" ? institutionAdminApi : studyProgramAdminApi) as unknown as AnyApi;
}

function itemTitle(item: AnyItem): string {
  return "programName" in item ? item.programName : item.institutionName;
}

// ---------- helper tampilan ----------
function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

// Aturan sama dengan backend: berakhir < hari ini = expired; <= 90 hari = expiring.
function clientExpiry(validUntil: string | null): { status: ExpiryStatus; days: number | null } {
  if (!validUntil) return { status: "unknown", days: null };
  const end = new Date(`${validUntil.slice(0, 10)}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { status: "expired", days };
  if (days <= 90) return { status: "expiring", days };
  return { status: "active", days };
}

function expiryOf(item: AnyItem): { status: ExpiryStatus; days: number | null } {
  if ("expiryStatus" in item) return { status: item.expiryStatus, days: item.daysUntilExpiry };
  return clientExpiry(item.validUntil);
}

const EXPIRY_COLORS: Record<ExpiryStatus, { bg: string; text: string; border: string }> = {
  active: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  expiring: { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
  expired: { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
  unknown: { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
};

function ExpiryBadge({ item }: { item: AnyItem }) {
  const { status, days } = expiryOf(item);
  const color = EXPIRY_COLORS[status];
  let hint = "";
  if (days !== null && status === "expiring") hint = ` · ${days} hari lagi`;
  if (days !== null && status === "expired") hint = ` · lewat ${Math.abs(days)} hari`;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {EXPIRY_LABELS[status]}
      {hint}
    </span>
  );
}

function DocumentCell({ document, onManage }: { document: AccreditationDocument | null; onManage: () => void }) {
  if (!document) {
    return (
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "2px 6px",
            borderRadius: 4,
            background: "#fef3c7",
            color: "#b45309",
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Belum Ada Dokumen
        </span>
        <div>
          <button
            className="aa-btn aa-btn-sm aa-btn-primary"
            onClick={onManage}
            style={{ padding: "3px 8px", fontSize: 11 }}
            type="button"
          >
            + Unggah SK
          </button>
        </div>
      </div>
    );
  }

  const previewUrl = resolveApiUrl(document.url);
  const downloadUrl = resolveApiUrl(document.downloadUrl ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontSize: 11.5,
          maxWidth: 170,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={document.name ?? undefined}
      >
        <code>{document.name ?? "dokumen"}</code>
      </div>
      <small style={{ color: "var(--admin-muted)" }}>{formatFileSize(document.size)}</small>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {previewUrl && (
          <a
            className="aa-btn aa-btn-sm"
            href={previewUrl}
            rel="noopener noreferrer"
            style={{ padding: "2px 6px", fontSize: 11, textDecoration: "none" }}
            target="_blank"
          >
            Lihat
          </a>
        )}
        {downloadUrl && (
          <a
            className="aa-btn aa-btn-sm"
            href={downloadUrl}
            rel="noopener noreferrer"
            style={{ padding: "2px 6px", fontSize: 11, textDecoration: "none" }}
            target="_blank"
          >
            Unduh
          </a>
        )}
        <button className="aa-btn aa-btn-sm" onClick={onManage} style={{ padding: "2px 6px", fontSize: 11 }} type="button">
          Ganti
        </button>
      </div>
    </div>
  );
}

function Required() {
  return <strong style={{ color: "#b3261e" }}>*</strong>;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return "Format file tidak didukung. Gunakan PDF, JPEG, atau PNG.";
  if (file.size > MAX_FILE_SIZE) return "Ukuran file maksimal 10 MB.";
  return null;
}

// ================= Modal Tambah / Edit =================
function AccreditationModal({
  kind,
  item,
  rankOptions,
  levelOptions,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item: AnyItem | null;
  rankOptions: string[];
  levelOptions: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const uid = useId();
  const isProgram = kind === "studyProgram";
  const program = item && "programName" in item ? item : null;
  const institution = item && "institutionName" in item ? item : null;

  const [institutionName, setInstitutionName] = useState(institution?.institutionName ?? "Universitas LIA");
  const [programName, setProgramName] = useState(program?.programName ?? "");
  const [educationLevel, setEducationLevel] = useState(program?.educationLevel ?? "S1");
  const [faculty, setFaculty] = useState(program?.faculty ?? "");
  const [rank, setRank] = useState(item?.rank ?? "");
  const [skNumber, setSkNumber] = useState(item?.skNumber ?? "");
  const [decisionDate, setDecisionDate] = useState(dateInputValue(item?.decisionDate));
  const [validFrom, setValidFrom] = useState(dateInputValue(item?.validFrom));
  const [validUntil, setValidUntil] = useState(dateInputValue(item?.validUntil));
  const [issuingBody, setIssuingBody] = useState(item?.issuingBody ?? "BAN-PT");
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "draft");
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rankList = Array.from(new Set([...RANK_SUGGESTIONS, ...rankOptions]));
  const levelList = Array.from(new Set([...LEVEL_SUGGESTIONS, ...levelOptions]));
  const existingDoc = item?.document ?? null;

  function pickFile(next: File | null) {
    if (next) {
      const problem = validateFile(next);
      if (problem) {
        setError(problem);
        setFile(null);
        return;
      }
    }
    setError(null);
    setFile(next);
    if (next) setRemoveExisting(false);
  }

  function validate(): string | null {
    if (isProgram && !programName.trim()) return "Nama program studi wajib diisi.";
    if (isProgram && !educationLevel.trim()) return "Jenjang pendidikan wajib diisi.";
    if (!rank.trim()) return "Peringkat akreditasi wajib diisi.";
    if (!skNumber.trim()) return "Nomor SK wajib diisi.";
    if (!isProgram && !decisionDate) return "Tanggal keputusan wajib diisi.";
    if (!validFrom) return "Tanggal mulai berlaku wajib diisi.";
    if (validUntil && validUntil < validFrom) return "Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai berlaku.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const api = apiFor(kind);
    const input: InstitutionInput & StudyProgramInput = {
      rank: rank.trim(),
      skNumber: skNumber.trim(),
      decisionDate: decisionDate || null,
      validFrom,
      validUntil: validUntil || null,
      status,
      ...(issuingBody.trim() ? { issuingBody: issuingBody.trim() } : {}),
      ...(isProgram
        ? {
            programName: programName.trim(),
            educationLevel: educationLevel.trim(),
            faculty: faculty.trim() || null,
          }
        : institutionName.trim()
          ? { institutionName: institutionName.trim() }
          : {}),
    };

    setSaving(true);
    setError(null);
    let savedId = item?.id ?? null;

    try {
      if (item) {
        setStep("Memperbarui data...");
        await api.update(item.id, input);
      } else {
        setStep("Menyimpan data...");
        const created = await api.create(input);
        savedId = created.id;
      }

      if (savedId && file) {
        setStep("Mengunggah dokumen SK...");
        await api.uploadDocument(savedId, file);
      } else if (savedId && item && removeExisting && existingDoc) {
        setStep("Menghapus dokumen SK...");
        await api.removeDocument(savedId);
      }

      onSaved(item ? "Data akreditasi berhasil diperbarui." : "Data akreditasi baru berhasil disimpan.");
      onClose();
    } catch (err) {
      if (savedId && !item) {
        // Data sudah tersimpan, hanya unggah dokumen yang gagal.
        onSaved(
          `Data akreditasi tersimpan, tetapi dokumen SK gagal diunggah (${errorMessage(err)}). Unggah ulang lewat tombol pada tabel.`,
        );
        onClose();
        return;
      }
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setStep("");
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
        <header
          className="aa-modal-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h2 className="aa-modal-title">
            {item ? "Edit" : "Tambah"} {KIND_LABEL[kind]}
          </h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          {isProgram ? (
            <>
              <div className="aa-field">
                <span>
                  Nama Program Studi <Required />
                </span>
                <input
                  id={`${uid}-program`}
                  maxLength={200}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Contoh: Manajemen"
                  required
                  type="text"
                  value={programName}
                />
              </div>
              <div className="aa-row">
                <div className="aa-field" style={{ maxWidth: 170 }}>
                  <span>
                    Jenjang <Required />
                  </span>
                  <input
                    id={`${uid}-level`}
                    list={`${uid}-levels`}
                    maxLength={50}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    required
                    type="text"
                    value={educationLevel}
                  />
                  <datalist id={`${uid}-levels`}>
                    {levelList.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
                <div className="aa-field">
                  <span>Fakultas (Opsional)</span>
                  <input
                    id={`${uid}-faculty`}
                    maxLength={200}
                    onChange={(e) => setFaculty(e.target.value)}
                    type="text"
                    value={faculty}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="aa-field">
              <span>Nama Institusi</span>
              <input
                id={`${uid}-institution`}
                maxLength={200}
                onChange={(e) => setInstitutionName(e.target.value)}
                type="text"
                value={institutionName}
              />
            </div>
          )}

          <div className="aa-row">
            <div className="aa-field" style={{ maxWidth: 240 }}>
              <span>
                Peringkat Akreditasi <Required />
              </span>
              <input
                id={`${uid}-rank`}
                list={`${uid}-ranks`}
                maxLength={100}
                onChange={(e) => setRank(e.target.value)}
                placeholder="Contoh: Baik Sekali"
                required
                type="text"
                value={rank}
              />
              <datalist id={`${uid}-ranks`}>
                {rankList.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="aa-field">
              <span>
                Nomor SK <Required />
              </span>
              <input
                id={`${uid}-sk`}
                maxLength={200}
                onChange={(e) => setSkNumber(e.target.value)}
                placeholder="Contoh: 1234/SK/BAN-PT/Ak-PPJ/S/I/2024"
                required
                type="text"
                value={skNumber}
              />
            </div>
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <span>
                Tanggal Keputusan {!isProgram && <Required />}
              </span>
              <input
                id={`${uid}-decision`}
                onChange={(e) => setDecisionDate(e.target.value)}
                required={!isProgram}
                type="date"
                value={decisionDate}
              />
            </div>
            <div className="aa-field">
              <span>
                Berlaku Mulai <Required />
              </span>
              <input
                id={`${uid}-from`}
                onChange={(e) => setValidFrom(e.target.value)}
                required
                type="date"
                value={validFrom}
              />
            </div>
            <div className="aa-field">
              <span>Berlaku Sampai</span>
              <input
                id={`${uid}-until`}
                min={validFrom || undefined}
                onChange={(e) => setValidUntil(e.target.value)}
                type="date"
                value={validUntil}
              />
            </div>
          </div>

          <div className="aa-field">
            <span>Penerbit SK</span>
            <input
              id={`${uid}-issuer`}
              maxLength={200}
              onChange={(e) => setIssuingBody(e.target.value)}
              type="text"
              value={issuingBody}
            />
          </div>

          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "#f8fafc",
              border: "1px dashed var(--admin-line, #cbd5e1)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-ink)" }}>
              Dokumen SK (PDF, JPEG, PNG — Maks. 10 MB)
            </span>

            {existingDoc && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid var(--admin-border, #e2e8f0)",
                  borderRadius: 6,
                  fontSize: 12.5,
                  opacity: removeExisting ? 0.5 : 1,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {existingDoc.name ?? "dokumen"}{" "}
                  <span style={{ color: "var(--admin-muted)" }}>({formatFileSize(existingDoc.size)})</span>
                </span>
                {!file && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}>
                    <input checked={removeExisting} onChange={(e) => setRemoveExisting(e.target.checked)} type="checkbox" />
                    Hapus dokumen
                  </label>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor={`${uid}-file`}
                style={{ display: "block", fontSize: 12, color: "var(--admin-muted)", marginBottom: 4 }}
              >
                {existingDoc ? "Pilih file baru untuk menggantikan dokumen lama:" : "Pilih file dokumen:"}
              </label>
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                id={`${uid}-file`}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                type="file"
              />
              {file && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#166534" }}>
                  File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
                </div>
              )}
            </div>
          </div>

          <div className="aa-field">
            <span>
              Status Publikasi <Required />
            </span>
            <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input checked={status === "draft"} name={`${uid}-status`} onChange={() => setStatus("draft")} type="radio" />
                <span>Draf (hanya terlihat admin)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input
                  checked={status === "published"}
                  name={`${uid}-status`}
                  onChange={() => setStatus("published")}
                  type="radio"
                />
                <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (tampil di website)</span>
              </label>
            </div>
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 8 }}>
            <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? step || "Menyimpan..." : item ? "Simpan Perubahan" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Unggah / Ganti Dokumen =================
function UploadModal({
  kind,
  item,
  onClose,
  onDone,
}: {
  kind: Kind;
  item: AnyItem;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(next: File | null) {
    if (next) {
      const problem = validateFile(next);
      if (problem) {
        setError(problem);
        setFile(null);
        return;
      }
    }
    setError(null);
    setFile(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih berkas dokumen terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFor(kind).uploadDocument(item.id, file);
      onDone(`Dokumen SK untuk "${itemTitle(item)}" berhasil diunggah.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeDoc() {
    setBusy(true);
    setError(null);
    try {
      await apiFor(kind).removeDocument(item.id);
      onDone(`Dokumen SK untuk "${itemTitle(item)}" berhasil dihapus.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 520 }}>
        <header
          className="aa-modal-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h2 className="aa-modal-title">{item.document ? "Ganti Dokumen SK" : "Unggah Dokumen SK"}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>

        <form className="aa-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <p className="aa-error">{error}</p>}

          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--admin-ink)" }}>{itemTitle(item)}</div>
            <div style={{ fontSize: 12, color: "var(--admin-muted)", marginTop: 2 }}>
              {item.skNumber} • Peringkat {item.rank}
            </div>
          </div>

          {item.document && (
            <div
              style={{
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid var(--admin-border, #e2e8f0)",
                borderRadius: 6,
                fontSize: 12.5,
              }}
            >
              <div style={{ color: "var(--admin-muted)", fontSize: 11, marginBottom: 2 }}>Dokumen saat ini:</div>
              <strong>{item.document.name ?? "dokumen"}</strong>{" "}
              <span style={{ color: "var(--admin-muted)" }}>({formatFileSize(item.document.size)})</span>
            </div>
          )}

          <div className="aa-field">
            <span>Pilih Berkas Baru (PDF, JPEG, PNG — Maks. 10 MB)</span>
            <input
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              type="file"
            />
            {file && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#166534" }}>
                File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </div>
            )}
          </div>

          <div className="aa-modal-actions" style={{ marginTop: 8, justifyContent: "space-between" }}>
            <div>
              {item.document && (
                <button className="aa-btn aa-btn-danger" disabled={busy} onClick={removeDoc} type="button">
                  Hapus Dokumen
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="aa-btn" disabled={busy} onClick={onClose} type="button">
                Batal
              </button>
              <button className="aa-btn aa-btn-primary" disabled={busy || !file} type="submit">
                {busy ? "Memproses..." : "Unggah Sekarang"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Konfirmasi Hapus =================
function DeleteModal({
  kind,
  item,
  onClose,
  onDeleted,
}: {
  kind: Kind;
  item: AnyItem;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await apiFor(kind).remove(item.id);
      onDeleted(`Data akreditasi "${itemTitle(item)}" berhasil dihapus.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 460 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          Hapus Data Akreditasi?
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 8px", fontSize: 14, lineHeight: 1.5 }}>
          Anda yakin ingin menghapus:
          <br />
          <strong>&ldquo;{itemTitle(item)}&rdquo;</strong> ({item.skNumber})?
        </p>
        {item.document && (
          <div
            style={{
              padding: "8px 12px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: 6,
              fontSize: 12,
              color: "#9f1239",
            }}
          >
            ⚠️ Dokumen SK <strong>{item.document.name ?? "terlampir"}</strong> juga akan ikut dihapus permanen.
          </div>
        )}
        <div className="aa-modal-actions" style={{ marginTop: 14 }}>
          <button className="aa-btn" disabled={busy} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-danger" disabled={busy} onClick={confirm} type="button">
            {busy ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Panel (satu tab) =================
function AccreditationPanel({ kind }: { kind: Kind }) {
  const isProgram = kind === "studyProgram";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AnyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [rankOptions, setRankOptions] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AnyItem | null>(null);
  const [uploading, setUploading] = useState<AnyItem | null>(null);
  const [deleting, setDeleting] = useState<AnyItem | null>(null);

  // Opsi filter (hanya tersedia untuk program studi)
  useEffect(() => {
    if (!isProgram) return;
    studyProgramAdminApi
      .filterOptions()
      .then((res) => {
        setLevelOptions(res.levels ?? []);
        setRankOptions(res.ranks ?? []);
      })
      .catch(() => {
        // Filter tetap bisa dipakai tanpa opsi dari server
      });
  }, [isProgram, reloadToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiFor(kind)
      .list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        ...(isProgram
          ? {
              level: levelFilter || undefined,
              rank: rankFilter || undefined,
              expiryStatus: expiryFilter || undefined,
            }
          : {}),
      })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages || 1);
      })
      .catch((err) => {
        if (!active) return;
        setError(errorMessage(err));
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, isProgram, page, debouncedSearch, statusFilter, levelFilter, rankFilter, expiryFilter, reloadToken]);

  function handleDone(message: string) {
    setNotice(message);
    setReloadToken((k) => k + 1);
  }

  async function toggleStatus(item: AnyItem) {
    const next: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      await apiFor(kind).update(item.id, { status: next });
      handleDone(
        next === "published"
          ? `"${itemTitle(item)}" telah dipublikasikan.`
          : `"${itemTitle(item)}" diubah kembali ke status Draf.`,
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const hasFilters = Boolean(search || statusFilter || levelFilter || rankFilter || expiryFilter);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  const colCount = 8;

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setLevelFilter("");
    setRankFilter("");
    setExpiryFilter("");
    setPage(1);
  }

  const control = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--admin-line)" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="aa-btn aa-btn-primary"
          onClick={() => setCreateOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          type="button"
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
          <span>{isProgram ? "Tambah Program Studi" : "Tambah Akreditasi Institusi"}</span>
        </button>
      </div>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}
      {error && <p className="aa-error">{error}</p>}

      <section
        style={{
          background: "#ffffff",
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--admin-border, #e2e8ed)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isProgram ? "1fr 120px 150px 160px 150px auto" : "1fr 160px auto",
            gap: 10,
          }}
        >
          <input
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              isProgram ? "Cari nama prodi, fakultas, nomor SK, atau peringkat..." : "Cari nama institusi, nomor SK, atau peringkat..."
            }
            style={control}
            type="text"
            value={search}
          />

          {isProgram && (
            <>
              <select
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setPage(1);
                }}
                style={control}
                value={levelFilter}
              >
                <option value="">Semua Jenjang</option>
                {levelOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                onChange={(e) => {
                  setRankFilter(e.target.value);
                  setPage(1);
                }}
                style={control}
                value={rankFilter}
              >
                <option value="">Semua Peringkat</option>
                {rankOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                onChange={(e) => {
                  setExpiryFilter(e.target.value);
                  setPage(1);
                }}
                style={control}
                value={expiryFilter}
              >
                <option value="">Semua Masa Berlaku</option>
                {(Object.keys(EXPIRY_LABELS) as ExpiryStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {EXPIRY_LABELS[key]}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={control}
            value={statusFilter}
          >
            <option value="">Semua Status</option>
            <option value="published">Dipublikasikan</option>
            <option value="draft">Draf</option>
          </select>

          <button className="aa-btn" disabled={!hasFilters} onClick={resetFilters} style={{ whiteSpace: "nowrap" }} type="button">
            Reset Filter
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--admin-muted)" }}>
          <span>
            Menampilkan data ke-<strong>{firstItem}</strong> sampai <strong>{lastItem}</strong> dari total{" "}
            <strong>{total}</strong> data
          </span>
          {hasFilters && <span>(Filter aktif)</span>}
        </div>
      </section>

      <section className="aa-table-wrap">
        <table className="aa-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: "center" }}>No</th>
              <th style={{ minWidth: 220 }}>{isProgram ? "Program Studi" : "Institusi"}</th>
              <th style={{ width: 130 }}>Peringkat</th>
              <th style={{ minWidth: 180 }}>Nomor SK</th>
              <th style={{ width: 190 }}>Masa Berlaku</th>
              <th style={{ width: 190 }}>Dokumen SK</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 130, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-muted)" }}>
                  Memuat data akreditasi...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <div className="aa-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada data akreditasi yang ditemukan.</p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13 }}>
                      {hasFilters
                        ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                        : "Belum ada data. Tambahkan data akreditasi pertama sekarang."}
                    </p>
                    {hasFilters ? (
                      <button className="aa-btn aa-btn-sm" onClick={resetFilters} type="button">
                        Bersihkan Filter
                      </button>
                    ) : (
                      <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={() => setCreateOpen(true)} type="button">
                        + Tambah Data
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center", color: "var(--admin-muted)", fontWeight: 600 }}>{firstItem + idx}</td>

                  <td>
                    <div style={{ fontWeight: 700, color: "var(--admin-ink-dark)", fontSize: 14, lineHeight: 1.4 }}>
                      {itemTitle(item)}
                    </div>
                    {"programName" in item && (
                      <div style={{ color: "var(--admin-muted)", fontSize: 12.5, marginTop: 2 }}>
                        {item.educationLevel}
                        {item.faculty ? ` • ${item.faculty}` : ""}
                      </div>
                    )}
                    {item.issuingBody && (
                      <small style={{ color: "var(--admin-muted)" }}>Penerbit: {item.issuingBody}</small>
                    )}
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: "#e0f2fe",
                        color: "#0369a1",
                        border: "1px solid #bae6fd",
                      }}
                    >
                      {item.rank}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4, wordBreak: "break-word" }}>{item.skNumber}</div>
                    <small style={{ color: "var(--admin-muted)" }}>Keputusan: {formatDate(item.decisionDate)}</small>
                  </td>

                  <td>
                    <div style={{ fontSize: 12.5, marginBottom: 4 }}>
                      {formatDate(item.validFrom)} – {item.validUntil ? formatDate(item.validUntil) : "…"}
                    </div>
                    <ExpiryBadge item={item} />
                  </td>

                  <td>
                    <DocumentCell document={item.document} onManage={() => setUploading(item)} />
                  </td>

                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span className={`aa-badge ${item.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}>
                        {item.status === "published" ? "Dipublikasikan" : "Draf"}
                      </span>
                      <button
                        className="aa-btn aa-btn-sm"
                        onClick={() => toggleStatus(item)}
                        style={{ fontSize: 11, padding: "2px 6px", color: item.status === "published" ? "#b45309" : "#166534" }}
                        type="button"
                      >
                        {item.status === "published" ? "Jadikan Draf" : "Terbitkan"}
                      </button>
                    </div>
                  </td>

                  <td>
                    <div className="aa-actions">
                      <button className="aa-btn aa-btn-sm" onClick={() => setEditing(item)} type="button">
                        Edit
                      </button>
                      <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => setDeleting(item)} type="button">
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

      {totalPages > 1 && (
        <footer className="aa-pagination">
          <button
            className="aa-btn aa-btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            ← Sebelumnya
          </button>
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <button
            className="aa-btn aa-btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            Berikutnya →
          </button>
        </footer>
      )}

      {createOpen && (
        <AccreditationModal
          item={null}
          kind={kind}
          levelOptions={levelOptions}
          onClose={() => setCreateOpen(false)}
          onSaved={handleDone}
          rankOptions={rankOptions}
        />
      )}
      {editing && (
        <AccreditationModal
          item={editing}
          kind={kind}
          levelOptions={levelOptions}
          onClose={() => setEditing(null)}
          onSaved={handleDone}
          rankOptions={rankOptions}
        />
      )}
      {uploading && (
        <UploadModal item={uploading} kind={kind} onClose={() => setUploading(null)} onDone={handleDone} />
      )}
      {deleting && (
        <DeleteModal item={deleting} kind={kind} onClose={() => setDeleting(null)} onDeleted={handleDone} />
      )}
    </>
  );
}

// ================= Halaman Admin Akreditasi =================
export function AkreditasiAdmin() {
  const [tab, setTab] = useState<Kind>("institution");

  const tabs: Array<{ key: Kind; label: string }> = [
    { key: "institution", label: "Akreditasi Institusi" },
    { key: "studyProgram", label: "Akreditasi Program Studi" },
  ];

  return (
    <div className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Akreditasi</h1>
          <p className="aa-subtitle">
            Kelola data akreditasi BAN-PT untuk institusi dan program studi beserta dokumen SK-nya. Hanya data berstatus
            Dipublikasikan yang tampil di website.
          </p>
        </div>
        <Link
          className="aa-btn"
          href="/profil/akreditasi"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          target="_blank"
          title="Lihat halaman akreditasi publik"
        >
          <span>Halaman Publik</span>
          <AdminIcon name="external" size={14} />
        </Link>
      </header>

      <div role="tablist" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--admin-border, #e2e8ed)" }}>
        {tabs.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              aria-selected={active}
              key={key}
              onClick={() => setTab(key)}
              role="tab"
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--admin-blue, #1d4ed8)" : "2px solid transparent",
                color: active ? "var(--admin-blue, #1d4ed8)" : "var(--admin-muted)",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -1,
              }}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* key memastikan state filter dan data direset saat berpindah tab */}
      <AccreditationPanel key={tab} kind={tab} />
    </div>
  );
}
