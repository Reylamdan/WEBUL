"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ContentLang } from "@/lib/api";

// Preferensi bahasa untuk KONTEN DINAMIS (berita & pengumuman dari backend). Teks antarmuka statis
// belum memiliki terjemahan, jadi preferensi ini hanya memengaruhi konten dari backend.
// Disimpan di localStorage (per perangkat) dan dibagikan ke semua komponen lewat store sederhana.
const STORAGE_KEY = "lia-content-lang";
const listeners = new Set<() => void>();

function read(): ContentLang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

let current: ContentLang | null = null;

function snapshot(): ContentLang {
  if (current === null) current = read();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      current = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useContentLang(): [ContentLang, (lang: ContentLang) => void] {
  // Server selalu "id" agar HTML awal konsisten; klien menyesuaikan setelah hydration.
  const lang = useSyncExternalStore(subscribe, snapshot, () => "id" as const);
  const setLang = useCallback((next: ContentLang) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Penyimpanan tidak tersedia (mode privat): preferensi hanya berlaku selama sesi halaman.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [lang, setLang];
}

// Label kategori untuk tampilan bahasa Inggris. Nilai kategori di backend selalu bahasa Indonesia.
const CATEGORY_EN: Record<string, string> = {
  Semua: "All",
  Kampus: "Campus",
  Prestasi: "Achievements",
  Universitas: "University",
  Akademik: "Academic",
  Administrasi: "Administration",
  Kemahasiswaan: "Student Affairs",
};

export function categoryLabel(category: string, lang: ContentLang): string {
  return lang === "en" ? (CATEGORY_EN[category] ?? category) : category;
}
