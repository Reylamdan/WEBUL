// Pemetaan jenis konten backend -> halaman publik frontend. Satu-satunya tempat yang perlu diubah
// bila route halaman berubah. Backend (searchService/assistantCitationService) masih memakai path
// bawaan sendiri, sehingga frontend menentukan tujuan tautan berdasarkan `type`, bukan `url` dari backend.

import type { AssistantCitation, SearchResult } from "./api";

export const CONTENT_PAGES = {
  news: "/kehidupan-kampus/berita-terkini",
  announcement: "/kehidupan-kampus/pengumuman",
  calendar: "/akademik/kalender-akademik",
  accreditationInstitution: "/profil/akreditasi",
  accreditationStudyProgram: "/akademik/akreditasi",
  banptRegulation: "/akademik/akreditasi#regulasi-banpt",
} as const;

// Query string yang membuka detail berita/pengumuman pada halaman daftarnya (modal).
export const DETAIL_PARAM = "baca";

export function newsDetailHref(slug: string): string {
  return `${CONTENT_PAGES.news}?${DETAIL_PARAM}=${encodeURIComponent(slug)}`;
}

export function announcementDetailHref(slug: string): string {
  return `${CONTENT_PAGES.announcement}?${DETAIL_PARAM}=${encodeURIComponent(slug)}`;
}

type ContentType = SearchResult["type"] | AssistantCitation["type"];

// Tujuan tautan untuk satu konten. `slug` dipakai oleh berita dan pengumuman.
export function contentHref(type: ContentType, slug?: string | null): string | null {
  switch (type) {
    case "news":
      return slug ? newsDetailHref(slug) : CONTENT_PAGES.news;
    case "announcement":
      return slug ? announcementDetailHref(slug) : CONTENT_PAGES.announcement;
    case "academic_calendar":
      return CONTENT_PAGES.calendar;
    case "accreditation_institution":
      return CONTENT_PAGES.accreditationInstitution;
    case "accreditation_study_program":
      return CONTENT_PAGES.accreditationStudyProgram;
    case "banpt_regulation":
      return CONTENT_PAGES.banptRegulation;
    default:
      return null;
  }
}

// Sitasi AI tidak membawa slug terpisah; backend membentuk URL "<situs>/api/<jenis>/<slug-atau-id>".
// Slug diambil dari segmen terakhir path tersebut.
export function citationHref(citation: AssistantCitation): { href: string; external: boolean } | null {
  if (citation.type === "knowledge") {
    // Hanya URL https resmi yang sudah divalidasi backend; selain itu sitasi tampil tanpa tautan.
    return citation.url && /^https:\/\//i.test(citation.url) ? { href: citation.url, external: true } : null;
  }

  let slug: string | null = null;
  if (citation.url) {
    try {
      const segments = new URL(citation.url).pathname.split("/").filter(Boolean);
      slug = segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : null;
    } catch {
      slug = null;
    }
  }
  const href = contentHref(citation.type, citation.type === "news" || citation.type === "announcement" ? slug : null);
  return href ? { href, external: false } : null;
}
