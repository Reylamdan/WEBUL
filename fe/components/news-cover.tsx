"use client";

import { useEffect, useState, type ReactNode } from "react";

// Gambar cover dari backend (Supabase Storage). Bila URL kosong atau gambar gagal dimuat
// (dihapus, bucket tidak publik, jaringan), tampilkan `fallback` alih-alih ikon gambar rusak.
export function NewsCover({
  src,
  fallback,
  alt = "",
  className,
}: {
  src: string | null | undefined;
  fallback: ReactNode;
  alt?: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className={className} decoding="async" loading="lazy" onError={() => setFailedSrc(src)} src={src} />
  );
}

// Untuk tempat yang memakai background-image: memeriksa dulu apakah gambar bisa dimuat.
export function useCoverLoadable(src: string | null | undefined): boolean {
  const [state, setState] = useState<{ src: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => !cancelled && setState({ src, ok: true });
    image.onerror = () => !cancelled && setState({ src, ok: false });
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return Boolean(src) && state !== null && state.src === src && state.ok;
}
