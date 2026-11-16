import Link from "next/link";
import { AdminIcon } from "@/components/admin/admin-icons";
import { ADMIN_NAV_GROUPS } from "@/components/admin/admin-nav-data";

export default function AdminPage() {
  const allDbModules = ADMIN_NAV_GROUPS.flatMap((g) =>
    g.items.filter((item) => item.id !== "dashboard")
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b1523 0%, #102a45 100%)",
          borderRadius: "14px",
          padding: "28px 32px",
          color: "#ffffff",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#38bdf8",
              }}
            />
            PANEL ADMINISTRATOR TERPADU
          </div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            Selamat Datang di Admin Dashboard Universitas LIA
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            Layout panel admin telah siap. Menu sidebar di sebelah kiri telah
            dihubungkan dengan seluruh tabel database &amp; endpoint REST API yang telah dibuat.
          </p>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            padding: "14px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Total Modul Database
          </span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#38bdf8" }}>
            {allDbModules.length} Modul
          </span>
        </div>
      </div>

      {/* Grid of Database Modules */}
      <div>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 16px",
          }}
        >
          Daftar Modul &amp; Tabel Database yang Terhubung di Sidebar
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {allDbModules.map((item) => (
            <Link
              href={item.href}
              key={item.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "18px 20px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#f0f7ff",
                    color: "#005b8c",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <AdminIcon name={item.icon} size={18} />
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-geist-mono), monospace",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8ed",
                  }}
                >
                  {item.dbTable.split(",")[0]}
                </span>
              </div>

              <div>
                <h4
                  style={{
                    margin: "4px 0 2px",
                    fontSize: "14.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {item.label}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#64748b",
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

