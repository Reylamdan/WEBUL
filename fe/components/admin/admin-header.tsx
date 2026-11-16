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
      if (item.href === pathname || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))) {
        currentItem = item;
        currentGroup = group.groupTitle;
        break;
      }
    }
    if (currentItem) break;
  }

  const pageTitle = currentItem ? currentItem.label : "Panel Administrasi";

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
            {currentItem && (
              <>
                <span className="admin-breadcrumb-sep">/</span>
                <span className="admin-breadcrumb-active">{currentItem.label}</span>
              </>
            )}
          </nav>
          <h1 className="admin-header-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="admin-header-right">
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
