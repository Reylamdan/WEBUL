"use client";

import { useEffect, useState } from "react";
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [accessResult, setAccessResult] = useState<{
    pathname: string;
    retryCount: number;
    status: "authorized" | "error";
    message?: string;
  } | null>(null);

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

    let active = true;
    const session = getAdminSession();
    if (!session) {
      router.replace("/admin/login");
      return () => {
        active = false;
      };
    }

    verifyAdminSession(session.token)
      .then((admin) => {
        if (
          admin.id !== session.admin.id ||
          admin.email.toLowerCase() !== session.admin.email.toLowerCase()
        ) {
          throw new ApiError(
            "Sesi tidak sesuai dengan akun administrator yang diverifikasi.",
            403,
            "ADMIN_SESSION_MISMATCH",
          );
        }
        if (active) {
          setAccessResult({ pathname, retryCount, status: "authorized" });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          clearAdminSession();
          router.replace("/admin/login");
          return;
        }
        setAccessResult({
          pathname,
          retryCount,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Sesi admin tidak dapat diverifikasi.",
        });
      });

    return () => {
      active = false;
    };
  }, [pathname, retryCount, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const currentAccess =
    accessResult?.pathname === pathname &&
    accessResult.retryCount === retryCount
      ? accessResult
      : null;

  if (!currentAccess) {
    return (
      <main aria-live="polite" className="admin-auth-checking">
        Memverifikasi sesi administrator...
      </main>
    );
  }

  if (currentAccess.status === "error") {
    return (
      <main className="admin-auth-checking">
        <p role="alert">{currentAccess.message}</p>
        <div className="admin-auth-checking-actions">
          <button onClick={() => setRetryCount((count) => count + 1)} type="button">
            Coba lagi
          </button>
          <button onClick={() => router.replace("/admin/login")} type="button">
            Kembali ke login
          </button>
        </div>
      </main>
    );
  }

  return (
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
          <div className="admin-content-container">
            {children}
          </div>
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}

