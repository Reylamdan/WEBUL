"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { ApiError } from "@/lib/api";
import { authenticateAdmin, storeAdminSession } from "@/lib/admin-auth";
import { closeGate } from "@/lib/admin-gate";
import { AdminLoginHeader } from "./admin-login-header";

/** Halaman tujuan setelah login berhasil (menu "Beranda" di panel admin). */
const AFTER_LOGIN_PATH = "/admin/beranda";

type Phase = "idle" | "submitting" | "success" | "leaving";

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
  const [capsLock, setCapsLock] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const timers = useRef<number[]>([]);
  const pageRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const isBusy = phase !== "idle";
  const isDone = phase === "success" || phase === "leaving";

  useEffect(() => {
    router.prefetch(AFTER_LOGIN_PATH);
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, [router]);

  function schedule(callback: () => void, delay: number) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  function shake() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    panelRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-10px)" },
        { transform: "translateX(9px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 420, easing: "ease-out" },
    );
  }

  // Panel biru bergeser halus mengikuti kursor (parallax)
  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    const el = pageRef.current;
    if (!el) return;
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    el.style.setProperty("--mx", x.toFixed(3));
    el.style.setProperty("--my", y.toFixed(3));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      shake();
      return;
    }

    setErrorMessage("");
    setPhase("submitting");

    try {
      const session = await authenticateAdmin(normalizedEmail, password);
      storeAdminSession(session);

      const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setPhase("success"); // tombol hijau + centang
      schedule(() => setPhase("leaving"), quick ? 0 : 700); // isi login memudar
      schedule(
        () => {
          closeGate(); // dua panel menutup layar
          router.replace(AFTER_LOGIN_PATH); // Beranda dimuat di belakangnya
        },
        quick ? 100 : 700 + 450,
      );
    } catch (error) {
      setErrorMessage(getLoginError(error));
      shake();
      setPhase("idle");
    }
  }

  return (
    <main
      className={`admin-login-page${phase === "leaving" ? " is-leaving" : ""}`}
      onMouseMove={handleMouseMove}
      ref={pageRef}
    >
      <div className="admin-login-card">
        <AdminLoginHeader />

        <div className="admin-login-stage">
          <section
            aria-labelledby="admin-login-title"
            className="admin-login-panel"
            ref={panelRef}
          >
            <div className="admin-login-panel-heading">
              <h2 id="admin-login-title">Masuk ke Admin</h2>
              <p>Gunakan email administrator yang terdaftar.</p>
            </div>

            <form className="admin-login-fields" onSubmit={handleSubmit}>
              <label className="admin-login-field">
                <span>Email</span>
                <span className="admin-login-input-wrap">
                  <Mail aria-hidden="true" size={18} />
                  <input
                    autoCapitalize="none"
                    autoComplete="username"
                    disabled={isBusy}
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
                    disabled={isBusy}
                    name="password"
                    onBlur={() => setCapsLock(false)}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyUp={(event) =>
                      setCapsLock(event.getModifierState("CapsLock"))
                    }
                    placeholder="Masukkan password"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Tampilkan password"
                    }
                    className="admin-login-password-toggle"
                    disabled={isBusy}
                    onClick={() => setShowPassword((shown) => !shown)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                {capsLock ? (
                  <span className="admin-login-caps" role="status">
                    <i aria-hidden="true" />
                    Caps Lock aktif
                  </span>
                ) : null}
              </label>

              {errorMessage ? (
                <p className="admin-login-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                className={`admin-login-submit${isDone ? " is-success" : ""}`}
                disabled={isBusy}
                type="submit"
              >
                {phase === "submitting" ? (
                  <>
                    <span aria-hidden="true" className="admin-login-spinner" />
                    Memverifikasi...
                  </>
                ) : isDone ? (
                  <>
                    <CheckIcon />
                    Akses diberikan
                  </>
                ) : (
                  <>
                    Masuk
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
      </div>

      <p className="admin-login-copyright">
        © Universitas LIA. Seluruh hak cipta dilindungi.
      </p>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="admin-login-check"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
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