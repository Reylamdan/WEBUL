"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminIcon } from "./admin-icons";
import { ADMIN_NAV_GROUPS } from "./admin-nav-data";

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const hasScrolledRef = useRef(false);

  // Scroll active item into view on pathname change
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const el = activeRef.current;
    const nav = navRef.current;
    if (el && nav) {
      hasScrolledRef.current = true;
      // Use requestAnimationFrame to ensure layout is settled
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "instant" });
      });
    }
  });

  const activeRefCallback = useCallback(
    (node: HTMLAnchorElement | null) => {
      activeRef.current = node;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname]
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return ADMIN_NAV_GROUPS;
    const q = searchQuery.toLowerCase().trim();
    return ADMIN_NAV_GROUPS.map((group) => {
      const items = group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          group.groupTitle.toLowerCase().includes(q)
      );
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const isItemActive = (href: string, id: string) => {
    if (pathname === href) return true;
    // Only match child routes if no other sibling item is an exact match
    if (href !== "/admin" && pathname.startsWith(`${href}/`)) {
      const group = filteredGroups.find((g) =>
        g.items.some((item) => item.id === id)
      );
      if (group) {
        const hasExactMatch = group.items.some(
          (item) => item.id !== id && pathname === item.href
        );
        if (hasExactMatch) return false;
      }
      return true;
    }
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="admin-sidebar-backdrop"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Sidebar Menu Admin"
        className={`admin-sidebar ${isOpen ? "is-open" : ""}`}
      >
        {/* Brand Header */}
        <div className="admin-sidebar-brand">
          <Link className="admin-brand-link" href="/admin" onClick={onClose}>
            <Image
              alt="Universitas LIA"
              className="admin-brand-logo"
              height={34}
              src="/Logo-Universitas-LIA-scaled.png"
              width={140}
            />
            <span className="admin-brand-badge">Admin</span>
          </Link>

          <button
            aria-label="Tutup sidebar"
            className="admin-sidebar-close-btn"
            onClick={onClose}
            type="button"
          >
            <AdminIcon name="close" size={20} />
          </button>
        </div>

        {/* Quick Menu Search */}
        <div className="admin-sidebar-search">
          <div className="admin-sidebar-search-box">
            <AdminIcon className="admin-search-icon" name="search" size={15} />
            <input
              aria-label="Cari menu halaman"
              className="admin-sidebar-search-input"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari halaman..."
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                aria-label="Hapus pencarian"
                className="admin-search-clear"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <AdminIcon name="close" size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="admin-sidebar-nav" ref={navRef}>
          {filteredGroups.map((group) => (
            <div className="admin-nav-group" key={group.groupTitle}>
              <div className="admin-group-title">{group.groupTitle}</div>
              <ul className="admin-group-list">
                {group.items.map((item) => {
                  const active = isItemActive(item.href, item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`admin-nav-link ${active ? "is-active" : ""}`}
                        href={item.href}
                        onClick={onClose}
                        ref={active ? activeRefCallback : undefined}
                        title={item.label}
                      >
                        <span className="admin-nav-icon">
                          <AdminIcon name={item.icon} size={17} />
                        </span>
                        <span className="admin-nav-label">{item.label}</span>
                        {active && (
                          <span
                            aria-hidden="true"
                            className="admin-nav-active-pill"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="admin-sidebar-empty">
              <p>Halaman tidak ditemukan</p>
            </div>
          )}
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="admin-sidebar-footer">
          <Link
            className="admin-public-website-btn"
            href="/"
            target="_blank"
            title="Buka Website Publik di tab baru"
          >
            <span>Lihat Website Publik</span>
            <AdminIcon name="external" size={14} />
          </Link>

          <div className="admin-user-profile">
            <div className="admin-user-avatar">AD</div>
            <div className="admin-user-info">
              <span className="admin-user-name">Admin LIA</span>
              <span className="admin-user-role">Administrator</span>
            </div>
            <Link
              aria-label="Logout"
              className="admin-logout-btn"
              href="/admin/login"
              title="Keluar dari Panel Admin"
            >
              <AdminIcon name="logout" size={16} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
