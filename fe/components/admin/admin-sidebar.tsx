"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
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

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return ADMIN_NAV_GROUPS;
    const q = searchQuery.toLowerCase().trim();
    return ADMIN_NAV_GROUPS.map((group) => {
      const items = group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.dbTable.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
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
            <div className="admin-brand-logo-wrap">
              <Image
                alt="Logo Universitas LIA"
                className="admin-brand-logo"
                height={32}
                src="/Logo-Universitas-LIA-scaled.png"
                width={120}
              />
            </div>
            <span className="admin-brand-badge">ADMIN</span>
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
              placeholder="Cari menu / tabel db..."
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
        <nav className="admin-sidebar-nav">
          {filteredGroups.map((group) => (
            <div className="admin-nav-group" key={group.groupTitle}>
              <div className="admin-group-title">{group.groupTitle}</div>
              <ul className="admin-group-list">
                {group.items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`admin-nav-link ${active ? "is-active" : ""}`}
                        href={item.href}
                        onClick={onClose}
                        title={`Tabel Database: ${item.dbTable}`}
                      >
                        <span className="admin-nav-icon">
                          <AdminIcon name={item.icon} size={18} />
                        </span>
                        <div className="admin-nav-text">
                          <span className="admin-nav-label">{item.label}</span>
                          <span className="admin-nav-table-hint">
                            {item.dbTable.split(",")[0]}
                          </span>
                        </div>
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
              <p>Menu tidak ditemukan</p>
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
              <span className="admin-user-role">Super Administrator</span>
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

