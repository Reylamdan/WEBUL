"use client";

import { useId } from "react";

export const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--admin-line)",
};

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TextField({
  label,
  value,
  onChange,
  max = 200,
  multiline = false,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="aa-field">
      <span>
        <label htmlFor={id}>{label}</label>
      </span>
      {multiline ? (
        <textarea id={id} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} value={value} />
      ) : (
        <input id={id} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="text" value={value} />
      )}
      {hint && <small style={{ color: "var(--admin-muted)", fontSize: 11.5 }}>{hint}</small>}
    </div>
  );
}

export function LinkField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextField
      hint="Awali dengan / (halaman di website), # (bagian halaman), atau https://"
      label={label}
      max={300}
      onChange={onChange}
      placeholder="/profil"
      value={value}
    />
  );
}

export function StatusRadios({
  value,
  onChange,
}: {
  value: "draft" | "published";
  onChange: (value: "draft" | "published") => void;
}) {
  const uid = useId();
  return (
    <div className="aa-field">
      <span>Status Publikasi</span>
      <div style={{ display: "flex", gap: 20, marginTop: 4, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
          <input checked={value === "draft"} name={`${uid}-status`} onChange={() => onChange("draft")} type="radio" />
          <span>Draf (hanya admin)</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
          <input checked={value === "published"} name={`${uid}-status`} onChange={() => onChange("published")} type="radio" />
          <span style={{ color: "#166534", fontWeight: 600 }}>Dipublikasikan (tampil di beranda)</span>
        </label>
      </div>
    </div>
  );
}

export function ModalFrame({
  title,
  onClose,
  maxWidth = 620,
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth }}>
        <header className="aa-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="aa-modal-title">{title}</h2>
          <button className="aa-btn aa-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }} type="button">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDelete({
  title,
  message,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: React.ReactNode;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 460 }}>
        <h2 className="aa-modal-title" style={{ color: "#b3261e" }}>
          {title}
        </h2>
        {error && <p className="aa-error">{error}</p>}
        <p style={{ margin: "4px 0 8px", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div className="aa-modal-actions" style={{ marginTop: 14 }}>
          <button className="aa-btn" disabled={busy} onClick={onCancel} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-danger" disabled={busy} onClick={onConfirm} type="button">
            {busy ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
