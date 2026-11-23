import { AdminLoginForm } from "@/components/admin/admin-login/admin-login-form";
import "@/components/admin/admin-login/admin-login.css";
import "@/components/admin/admin-login/admin-login-form";

export const metadata = {
  title: "Login Admin — Universitas LIA",
  description: "Login administrator Universitas LIA.",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
