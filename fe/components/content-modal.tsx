"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";

interface ContentModalProps {
  eyebrow: string;
  title: string;
  date?: string;
  onClose: () => void;
  children: ReactNode;
}

// Jendela detail konten (berita, pengumuman). Memakai kelas .pengumuman-modal-* yang sudah ada.
export function ContentModal({ eyebrow, title, date, onClose, children }: ContentModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div aria-labelledby={titleId} aria-modal="true" className="pengumuman-modal-backdrop" onClick={onClose} role="dialog">
      <div className="pengumuman-modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="pengumuman-modal-header">
          <div>
            <span className="pengumuman-card-category">{eyebrow}</span>
            <h4 className="pengumuman-modal-title" id={titleId}>
              {title}
            </h4>
            {date && <span className="pengumuman-modal-date">{date}</span>}
          </div>
          <button aria-label="Tutup jendela modal" className="pengumuman-modal-close" onClick={onClose} ref={closeRef} type="button">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="pengumuman-modal-body">{children}</div>
        <div className="pengumuman-modal-footer">
          <button className="pengumuman-modal-btn-close" onClick={onClose} type="button">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
