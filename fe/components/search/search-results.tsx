import Link from "next/link";
import type { SearchPage } from "./search-data";

type SearchResultsProps = {
  results: SearchPage[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onResultRef: (index: number, element: HTMLAnchorElement | null) => void;
  onNavigate: () => void;
};

export function SearchResults({
  results,
  activeIndex,
  onActiveIndexChange,
  onResultRef,
  onNavigate,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <>
        <ul
          aria-label="Hasil pencarian"
          className="global-search-results"
          id="global-search-results"
          role="listbox"
        />
        <p className="global-search-empty" role="status">
          Tidak ada halaman yang cocok. Coba kata kunci lain.
        </p>
      </>
    );
  }

  return (
    <ul
      aria-label="Hasil pencarian"
      className="global-search-results"
      role="listbox"
    >
      {results.map((result, index) => (
        <li key={result.href + result.title}>
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
              <span className="global-search-result-description">
                {result.description}
              </span>
            </span>
            <span className="global-search-result-meta">
              <span>{result.category}</span>
              <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
