"use client";

// Pagination bersama (kelas .pagination / .pagination-btn sudah ada di design system).
function pageWindow(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}

export function Pagination({ page, totalPages, onChange, label = "Navigasi halaman" }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="pagination">
      {page > 1 && (
        <button className="pagination-btn" onClick={() => onChange(page - 1)} type="button">
          Prev
        </button>
      )}
      {pageWindow(page, totalPages).map((number) => (
        <button
          aria-current={number === page ? "page" : undefined}
          className={`pagination-btn${number === page ? " active" : ""}`}
          key={number}
          onClick={() => onChange(number)}
          type="button"
        >
          {number}
        </button>
      ))}
      {page < totalPages && (
        <button className="pagination-btn" onClick={() => onChange(page + 1)} type="button">
          Next
        </button>
      )}
    </nav>
  );
}
