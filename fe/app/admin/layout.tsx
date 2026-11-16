import type { Metadata } from "next";
import { AdminShell } from "@/components/admin";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin Dashboard — Universitas LIA",
  description: "Panel Administrasi Terpadu Sistem Informasi Universitas LIA",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}

