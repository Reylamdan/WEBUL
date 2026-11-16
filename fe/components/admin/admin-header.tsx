"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon } from "./admin-icons";
import { ADMIN_NAV_GROUPS, AdminNavItem } from "./admin-nav-data";

export function AdminHeader({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();

  // Find active item info
  let currentItem: AdminNavItem | null = null;
  let currentGroup = "Dashboard";

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === "/admin" && pathname === "/admin") {
        currentItem = item;
        currentGroup = group.groupTitle;
        break;
      } else if (item.href !== "/admin" && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
        currentItem = item;
        currentGroup = group.groupTitle;
        break;
      }
    }
    if (currentItem) break;
  }

  const pageTitle = currentItem ? currentItem.label : "Panel Administrasi";
  const dbTable = currentItem ? currentItem.dbTable : null;

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          aria-label="Toggle Sidebar Menu"
          className="admin-hamburger-btn"
          onClick={onToggleSidebar}
          type="button"
        >
          <AdminIcon name="menu" size={20} />
        </button>

        <div className="admin-header-titles">
          <nav aria-label="Admin Breadcrumb" className="admin-header-breadcrumb">
            <span>Admin</span>
            <span className="admin-breadcrumb-sep">/</span>
            <span>{currentGroup}</span>
            {currentItem && currentItem.href !== "/admin" && (
              <>
                <span className="admin-breadcrumb-sep">/</span>
                <span className="admin-breadcrumb-active">{currentItem.label}</span>
              </>
            )}
          </nav>
          <div className="admin-header-main-title-wrap">
            <h1 className="admin-header-title">{pageTitle}</h1>
            {dbTable && (
              <span className="admin-db-badge" title={`Tabel Database Supabase: ${dbTable}`}>
                <AdminIcon name="database" size={12} />
                <span>{dbTable}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Status indicator */}
        <div className="admin-status-indicator" title="Koneksi Supabase PostgreSQL">
          <span className="admin-status-dot" />
          <span className="admin-status-label">Database Connected</span>
        </div>

        {/* Quick link to public website */}
        <Link
          className="admin-header-action-btn"
          href="/"
          target="_blank"
          title="Buka Website Publik"
        >
          <span>Website Publik</span>
          <AdminIcon name="external" size={13} />
        </Link>
      </div>
    </header>
  );
}

