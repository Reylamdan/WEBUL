"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { openGate, useGate } from "@/lib/admin-gate";
import "./admin-gate.css";

export function AdminGate() {
  const gate = useGate();
  const pathname = usePathname();

  // Begitu halaman tujuan tampil di belakang panel, buka pintunya.
  useEffect(() => {
    if (gate !== "closed" || pathname === "/admin/login") return;
    const timer = window.setTimeout(openGate, 450);
    return () => window.clearTimeout(timer);
  }, [gate, pathname]);

  if (gate === "idle") return null;

  return (
    <div aria-hidden="true" className={`admin-portal is-${gate}`}>
      <div className="admin-portal-door is-left">
        <Image
          alt=""
          className="admin-portal-logo"
          height={48}
          src="/Logo-Universitas-LIA-scaled.png"
          width={214}
        />
      </div>
      <div className="admin-portal-door is-right" />
    </div>
  );
}