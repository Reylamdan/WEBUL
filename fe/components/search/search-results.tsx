import Link from "next/link";
import { errorMessage } from "@/lib/api";
import type { SearchEntry } from "./use-global-search";

type SearchResultsProps = {
  results: SearchEntry[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onResultRef: (index: number, element: HTMLAnchorElement | null) => void;
  onNavigate: () => void;
  // Status pencarian ke backend (konten dinamis). Halaman statis lokal tetap tampil di `results`.
  loading?: boolean;
  error?: unknown;
  partial?: boolean;
  searching?: boolean;
};

export function SearchResults({
  results,
  activeIndex,
  onActiveIndexChange,
  onResultRef,
  onNavigate,
  loading = false,
  error,
  partial = false,
  searching = false,
}: SearchResultsProps) {
  const notices = (
    <>
      {error ? (
        <p className="global-search-empty" role="alert">
          {errorMessage(error)} Hasil halaman situs tetap ditampilkan.
        </p>
      ) : loading ? (
        <p className="global-search-empty" role="status">
          Mencari berita, pengumuman, dan informasi lainnya...
        </p>
      ) : partial ? (
        <p className="global-search-empty" role="status">
          Sebagian sumber pencarian sedang tidak tersedia, hasil mungkin belum lengkap.
        </p>
      ) : null}
    </>
  );

  if (results.length === 0) {
    return (
      <>
        <ul
          aria-label="Hasil pencarian"
          className="global-search-results"
          id="global-search-results"
          role="listbox"
        />
        {error || loading ? (
          notices
        ) : (
          <p className="global-search-empty" role="status">
            {partial
              ? "Sebagian sumber pencarian sedang tidak tersedia dan belum ada hasil yang cocok. Coba lagi nanti."
              : searching
                ? "Tidak ada hasil yang cocok. Coba kata kunci lain."
                : "Belum ada halaman untuk ditampilkan."}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <ul
        aria-label="Hasil pencarian"
        className="global-search-results"
        id="global-search-results"
        role="listbox"
      >
        {results.map((result, index) => (
          <li key={result.key}>
            <Link
              aria-selected={activeIndex === index}
              className={`global-search-result${activeIndex === index ? " is-active" : ""}`}
              href={result.href}
              id={`global-search-result-${index}`}
              onClick={onNavigate}
              onMouseEnter={() => onActiveIndexChange(index)}
              ref={(element) => onResultRef(index, element)}
              role="option"
            >
              <span className="global-search-result-copy">
                <span className="global-search-result-title">{result.title}</span>
                <span className="global-search-result-description">{result.description}</span>
              </span>
              <span className="global-search-result-meta">
                <span>{result.category}</span>
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {notices}
    </>
  );
}
