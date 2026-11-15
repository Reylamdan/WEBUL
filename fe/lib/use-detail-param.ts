"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DETAIL_PARAM } from "./content-routes";

// Slug konten yang sedang dibuka pada jendela detail, dibaca dari ?baca=<slug>.
// Komponen pemakainya harus berada di dalam <Suspense> (syarat useSearchParams pada Next.js).
export function useDetailParam() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const slug = searchParams.get(DETAIL_PARAM);

  const close = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { slug: slug && slug.trim() ? slug.trim() : null, close };
}
