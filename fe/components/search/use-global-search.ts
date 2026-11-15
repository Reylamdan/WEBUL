"use client";

import { useEffect, useMemo, useState } from "react";
import { isAbortError, searchApi, type SearchResponse, type SearchResult, type SearchResultType, formatDate } from "@/lib/api";
import { contentHref } from "@/lib/content-routes";
import { useDebouncedValue } from "@/lib/use-api";
import { findSearchPages } from "./search-data";

// Satu baris hasil pada dialog pencarian, baik dari backend (konten dinamis) maupun data lokal (halaman statis).
export type SearchEntry = {
  key: string;
  title: string;
  category: string;
  description: string;
  href: string;
  group: "content" | "page";
};

const MIN_REMOTE_LENGTH = 2;
const REMOTE_LIMIT = 10;
const MAX_CONTENT_ENTRIES = 6;
const MAX_PAGE_ENTRIES = 6;
const DEBOUNCE_MS = 350;

const TYPE_LABEL: Record<SearchResultType, string> = {
  news: "Berita",
  announcement: "Pengumuman",
  academic_calendar: "Kalender Akademik",
  accreditation_institution: "Akreditasi Institusi",
  accreditation_study_program: "Akreditasi Program Studi",
  banpt_regulation: "Peraturan BAN-PT",
};

// Pembersihan yang sama dengan backend (karakter khusus filter pencarian diganti spasi).
function cleanTerm(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEntry(result: SearchResult): SearchEntry | null {
  const href = contentHref(result.type, result.slug);
  if (!href) return null;
  const date = result.type === "news" || result.type === "announcement" ? formatDate(result.date) : "";
  return {
    key: `${result.type}:${result.id}`,
    title: result.title,
    category: [TYPE_LABEL[result.type], date].filter(Boolean).join(" · "),
    description: result.excerpt,
    href,
    group: "content",
  };
}

interface RemoteState {
  term: string;
  data?: SearchResponse;
  error?: unknown;
}

export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  const cleaned = useMemo(() => cleanTerm(trimmed), [trimmed]);
  const debounced = useDebouncedValue(cleaned, DEBOUNCE_MS);
  const remoteTerm = debounced.length >= MIN_REMOTE_LENGTH ? debounced : "";
  const [remote, setRemote] = useState<RemoteState | null>(null);

  useEffect(() => {
    if (!remoteTerm) return;
    // Permintaan sebelumnya dibatalkan bila kata kunci berubah, sehingga hasil lama tidak menimpa hasil baru.
    const controller = new AbortController();
    searchApi.search(remoteTerm, REMOTE_LIMIT, controller.signal).then(
      (data) => setRemote({ term: remoteTerm, data }),
      (error: unknown) => {
        if (!isAbortError(error)) setRemote({ term: remoteTerm, error });
      },
    );
    return () => controller.abort();
  }, [remoteTerm]);

  const wantsRemote = cleaned.length >= MIN_REMOTE_LENGTH;
  const settled = remoteTerm !== "" && remote?.term === remoteTerm;
  // "Menunggu" mencakup jeda debounce dan permintaan yang sedang berjalan.
  const loading = wantsRemote && (debounced !== cleaned || !settled);
  const error = wantsRemote && settled ? remote?.error : undefined;
  // Hasil sebelumnya tetap tampil selama permintaan berikutnya berjalan agar daftar tidak berkedip.
  const remoteData = wantsRemote ? remote?.data : undefined;

  const entries = useMemo<SearchEntry[]>(() => {
    const content = (remoteData?.results ?? [])
      .map(toEntry)
      .filter((entry): entry is SearchEntry => entry !== null)
      .slice(0, MAX_CONTENT_ENTRIES);
    const pages = findSearchPages(query)
      .slice(0, trimmed ? MAX_PAGE_ENTRIES : 8)
      .map<SearchEntry>((page) => ({
        key: `page:${page.href}:${page.title}`,
        title: page.title,
        category: page.category,
        description: page.description,
        href: page.href,
        group: "page",
      }));
    return [...content, ...pages];
  }, [remoteData, query, trimmed]);

  return { entries, loading, error, partial: Boolean(remoteData?.partial) && !error, searching: trimmed.length > 0 };
}
