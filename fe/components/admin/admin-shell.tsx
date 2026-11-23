"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  clearAdminSession,
  getAdminSession,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminFooter } from "./admin-footer";
import { AdminGate } from "./admin-gate";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  const verifiedRef = useRef(false);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    const session = getAdminSession();
    if (!session) {
      setIsAuthorized(false);
      router.replace("/admin/login");
      return;
    }

    setIsAuthorized(true);

    // Verifikasi sesi ke backend di background (cukup sekali per session load)
    if (!verifiedRef.current) {
      verifiedRef.current = true;
      verifyAdminSession(session.token)
        .then((admin) => {
          if (
            admin.id !== session.admin.id ||
            admin.email.toLowerCase() !== session.admin.email.toLowerCase()
          ) {
            clearAdminSession();
            router.replace("/admin/login");
          }
        })
        .catch((error: unknown) => {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
          ) {
            clearAdminSession();
            router.replace("/admin/login");
          }
        });
    }
  }, [pathname, router]);

    if (pathname === "/admin/login") {
    return (
      <>
        <AdminGate />
        {children}
      </>
    );
  }

  // Jika tidak ada session / belum login, jangan render layout admin (langsung redirect)
  if (isAuthorized === false) {
    return <AdminGate />;
  }

  return (
    <>
      <AdminGate />

      <div className="admin-root-layout">
        {/* Sidebar Navigation */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="admin-main-wrapper">
          <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <main className="admin-main-content">
            <div className="admin-content-container">{children}</div>
          </main>

          <AdminFooter />
        </div>
      </div>
    </>
  );
}