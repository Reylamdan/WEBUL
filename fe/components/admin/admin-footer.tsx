"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminIcon } from "./admin-icons";

export function AdminFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCurrentYear(new Date().getFullYear());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <footer className="admin-footer">
      <div className="admin-footer-content">
        <div className="admin-footer-left">
          <p className="admin-footer-copyright">
            &copy; {currentYear ?? ""} <strong>Universitas LIA</strong> — Panel Administrasi Terpadu.
          </p>
          <p className="admin-footer-sub">
            Didukung oleh Supabase PostgreSQL, Express 5 REST API, dan Cloudinary Storage.
          </p>
        </div>

        <div className="admin-footer-right">
          <div className="admin-footer-pills">
            <span className="admin-footer-pill">
              <span className="admin-footer-dot-green" />
              API v1.0.0
            </span>
            <span className="admin-footer-pill">Supabase DB</span>
          </div>

          <div className="admin-footer-links">
            <Link className="admin-footer-link" href="/" target="_blank">
              <span>Web Publik</span>
              <AdminIcon name="external" size={11} />
            </Link>
            <span className="admin-footer-sep">&bull;</span>
            <Link className="admin-footer-link" href="/admin">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

