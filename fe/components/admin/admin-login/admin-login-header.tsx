import Image from "next/image";

export function AdminLoginHeader() {
  return (
    <header className="admin-login-branding">
      <div aria-hidden="true" className="admin-login-decoration">
        <span />
        <span />
        <span />
      </div>

      <div className="admin-login-brand-center">
        <div className="admin-login-logo-wrap">
          <Image
            alt="Universitas LIA"
            height={48}
            priority
            src="/Logo-Universitas-LIA-scaled.png"
            width={214}
          />
        </div>
        <span className="admin-login-brand-label">PANEL ADMINISTRATOR</span>
        <h1>Kelola informasi Universitas LIA dengan aman.</h1>
      </div>

      <div className="admin-login-brand-footer">
        <span className="admin-login-status-dot" />
        Sistem administrasi Universitas LIA
      </div>
    </header>
  );
}
