"use client";

import { useState, type MouseEvent } from "react";
import { API_BASE_URL, resolveApiUrl, type FileLink } from "@/lib/api";

// Memastikan file dari backend kita masih ada sebelum dibuka, agar pengunjung tidak melihat JSON error mentah.
// File dari host lain (mis. Supabase Storage lama) dibuka langsung. Kegagalan jaringan tidak memblokir.
async function fileStatus(url: string): Promise<"ok" | "missing" | "unavailable"> {
  const ours = API_BASE_URL ? url.startsWith(API_BASE_URL) : url.startsWith("/") || url.startsWith(window.location.origin);
  if (!ours) return "ok";
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.ok) return "ok";
    if (response.status === 404) return "missing";
    if (response.status === 429 || response.status >= 500) return "unavailable";
    return "missing";
  } catch {
    return "ok";
  }
}

const MESSAGES = {
  missing: "Dokumen tidak ditemukan.",
  unavailable: "Dokumen belum dapat dibuka. Coba lagi beberapa saat lagi.",
} as const;

interface DocumentLinkProps {
  file: FileLink | null | undefined;
  // Label tombol; default "Lihat" dan "Unduh".
  viewLabel?: string;
  downloadLabel?: string;
  className?: string;
  // Teks bila tidak ada dokumen. Kosong = tidak menampilkan apa pun.
  emptyLabel?: string;
}

export function DocumentLink({
  file,
  viewLabel = "Lihat",
  downloadLabel = "Unduh",
  className = "document-links",
  emptyLabel = "-",
}: DocumentLinkProps) {
  const [problem, setProblem] = useState<keyof typeof MESSAGES | null>(null);
  const viewUrl = resolveApiUrl(file?.url);
  // Dokumen lama (Supabase) tidak punya downloadUrl terpisah: tautan "Lihat" tetap dipakai.
  const downloadUrl = resolveApiUrl(file?.downloadUrl) ?? viewUrl;

  if (!viewUrl) return emptyLabel ? <span>{emptyLabel}</span> : null;

  async function open(event: MouseEvent<HTMLAnchorElement>, url: string, download: boolean) {
    event.preventDefault();
    setProblem(null);
    // Jendela dibuka serentak dengan klik agar tidak diblokir pemblokir popup.
    const preview = download ? null : window.open("about:blank", "_blank");
    const status = await fileStatus(url);
    if (status !== "ok") {
      preview?.close();
      setProblem(status);
      return;
    }
    if (download) window.location.assign(url);
    else if (preview) {
      preview.opener = null;
      preview.location.href = url;
    } else window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <span className={className}>
      <a
        className="document-link"
        href={viewUrl}
        onClick={(event) => open(event, viewUrl, false)}
        rel="noopener noreferrer"
        target="_blank"
      >
        {viewLabel}
      </a>
      {downloadUrl && downloadUrl !== viewUrl && (
        <a className="document-link" href={downloadUrl} onClick={(event) => open(event, downloadUrl, true)}>
          {downloadLabel}
        </a>
      )}
      {problem && (
        <small className="document-link-error" role="alert">
          {MESSAGES[problem]}
        </small>
      )}
    </span>
  );
}
