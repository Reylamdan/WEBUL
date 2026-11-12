"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { Icon } from "@/components/icons";
import { findSearchPages } from "./search-data";
import { SearchResults } from "./search-results";

type GlobalSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

type SearchToggleProps = {
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  isOpen: boolean;
};

export function SearchToggle({
  onOpen,
  className = "",
  isOpen,
}: SearchToggleProps) {
  return (
    <button
      aria-controls="global-search-dialog"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label="Cari di situs"
      className={`search-toggle-btn ${className}`.trim()}
      onClick={onOpen}
      type="button"
    >
      <Icon name="search" size={18} />
    </button>
  );
}

export function GlobalSearch({
  isOpen,
  onClose,
  triggerRef,
}: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => findSearchPages(query).slice(0, 8), [query]);

  useEffect(() => {
    if (!isOpen) return;

    const searchTrigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      searchTrigger?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigateToActiveResult() {
    const selectedResult = results[activeIndex];
    if (!selectedResult) return;
    onClose();
    router.push(selectedResult.href);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (
      event.key === "Enter" &&
      event.target === inputRef.current &&
      results.length > 0
    ) {
      event.preventDefault();
      navigateToActiveResult();
    } else if (event.key === "Tab") {
      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled)',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="global-search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="global-search-title"
        aria-modal="true"
        className="global-search-dialog"
        id="global-search-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <div className="global-search-heading">
          <div>
            <span className="global-search-eyebrow">UNIVERSITAS LIA</span>
            <h2 id="global-search-title">Cari di seluruh situs</h2>
          </div>
          <button
            aria-label="Tutup pencarian"
            className="global-search-close"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <label className="global-search-input-wrap">
          <Icon name="search" size={21} />
          <input
            aria-activedescendant={
              results[activeIndex]
                ? `global-search-result-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-label="Kata kunci pencarian"
            aria-expanded="true"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Cari halaman, program studi, atau informasi..."
            ref={inputRef}
            role="combobox"
            value={query}
          />
          <button
            aria-label="Hapus kata pencarian"
            className="global-search-clear"
            disabled={!query}
            onClick={() => {
              setQuery("");
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
            type="button"
          >
            Hapus
          </button>
        </label>

        <div className="global-search-results-header">
          <span>{query.trim() ? "Hasil pencarian" : "Halaman populer"}</span>
          {query.trim() ? <span>{results.length} hasil</span> : null}
        </div>
        <div className="global-search-results-wrap">
          <SearchResults
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onResultRef={(index, element) => {
              resultRefs.current[index] = element;
            }}
            onNavigate={onClose}
            results={results}
          />
        </div>
        <div className="global-search-hint">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> untuk memilih
          </span>
          <span>
            <kbd>Enter</kbd> buka halaman
          </span>
          <span>
            <kbd>Esc</kbd> tutup
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
