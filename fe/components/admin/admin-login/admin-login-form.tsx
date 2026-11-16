"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { authenticateAdmin, storeAdminSession } from "@/lib/admin-auth";
import { AdminLoginHeader } from "./admin-login-header";

function getLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return "Email atau password salah. Periksa kembali data login Anda.";
    }
    if (error.code === "FORBIDDEN" || error.code === "ADMIN_VERIFICATION_FAILED") {
      return "Akun ini tidak memiliki akses administrator.";
    }
    return error.message;
  }
  return "Login belum dapat diproses. Silakan coba kembali.";
}

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const session = await authenticateAdmin(normalizedEmail, password);
      storeAdminSession(session);
      router.replace("/admin");
    } catch (error) {
      setErrorMessage(getLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <AdminLoginHeader />

        <section aria-labelledby="admin-login-title" className="admin-login-panel">
          <div className="admin-login-panel-heading">
            <span aria-hidden="true" className="admin-login-shield">
              <ShieldCheck size={21} strokeWidth={1.8} />
            </span>
            <span className="admin-login-eyebrow">AKSES TERBATAS</span>
            <h2 id="admin-login-title">Masuk ke Admin</h2>
            <p>Gunakan email administrator yang terdaftar.</p>
          </div>

          <form className="admin-login-fields" onSubmit={handleSubmit}>
            <label className="admin-login-field">
              <span>Email</span>
              <span className="admin-login-input-wrap">
                <Mail aria-hidden="true" size={18} />
                <input
                  autoComplete="username"
                  autoCapitalize="none"
                  disabled={isSubmitting}
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@universitaslia.ac.id"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="admin-login-field">
              <span>Password</span>
              <span className="admin-login-input-wrap">
                <LockKeyhole aria-hidden="true" size={18} />
                <input
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="admin-login-password-toggle"
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((shown) => !shown)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {errorMessage ? (
              <p className="admin-login-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="admin-login-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span aria-hidden="true" className="admin-login-spinner" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Dashboard
                  <span aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="admin-login-security-note">
            <LockKeyhole aria-hidden="true" size={14} />
            Akses dilindungi dan hanya tersedia untuk administrator aktif.
          </p>
        </section>
      </div>
      <p className="admin-login-copyright">
        © Universitas LIA. Seluruh hak cipta dilindungi.
      </p>
    </main>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
