"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MenuNode = {
  id: string;
  label: string;
  href?: string;
  children?: MenuNode[];
};

const navigation: {
  id: string;
  label: string;
  href?: string;
  items?: MenuNode[];
}[] = [
  {
    id: "profil",
    label: "Profil",
    items: [
      { id: "sejarah", label: "Sejarah", href: "#tentang" },
      { id: "visi", label: "Visi & Misi", href: "#tentang" },
      { id: "struktur", label: "Struktur Organisasi", href: "#tentang" },
      { id: "akreditasi", label: "Akreditasi", href: "#tentang" },
      { id: "fasilitas", label: "Fasilitas Kampus", href: "#kehidupan" },
    ],
  },
  {
    id: "akademik",
    label: "Akademik",
    href: "/akademik/fakultas",
    items: [
      { id: "fakultas", label: "Daftar Fakultas", href: "#program" },
      {
        id: "program-studi",
        label: "Program Studi",
        children: [
          {
            id: "humaniora",
            label: "Humaniora dan Desain",
            children: [
              { id: "desain", label: "S1 Desain Komunikasi Visual", href: "#program" },
              { id: "jepang", label: "S1 Bahasa Jepang", href: "#program" },
              { id: "inggris-d3", label: "D3 Bahasa Inggris", href: "#program" },
              { id: "inggris-s1", label: "S1 Bahasa Inggris", href: "#program" },
            ],
          },
          {
            id: "bisnis",
            label: "Sains dan Bisnis",
            children: [
              { id: "digital", label: "S1 Bisnis Digital", href: "#program" },
              { id: "informasi", label: "S1 Sistem Informasi", href: "#program" },
              { id: "informatika", label: "S1 Informatika", href: "#program" },
            ],
          },
        ],
      },
      { id: "kalender", label: "Kalender Akademik", href: "#kabar" },
      { id: "kurikulum", label: "Kurikulum", href: "#program" },
    ],
  },
  {
    id: "pmb",
    label: "PMB",
    items: [
      { id: "jalur", label: "Jalur Pendaftaran", href: "#pmb" },
      { id: "biaya", label: "Biaya Kuliah", href: "#pmb" },
      { id: "beasiswa", label: "Beasiswa", href: "#pmb" },
    ],
  },
  { id: "lppm", label: "LPPM", href: "#kabar" },
  {
    id: "kehidupan",
    label: "Kehidupan Kampus",
    items: [
      { id: "ukm", label: "Kegiatan Mahasiswa (UKM)", href: "#kehidupan" },
      { id: "berita", label: "Berita Terkini", href: "#kabar" },
      { id: "pengumuman", label: "Pengumuman", href: "#kabar" },
      { id: "agenda", label: "Agenda Acara", href: "#kabar" },
    ],
  },
  {
    id: "alumni",
    label: "Alumni",
    items: [
      { id: "ikatan", label: "Ikatan Alumni", href: "#footer" },
      { id: "tracer", label: "Tracer Study (Kuesioner Alumni)", href: "#footer" },
      { id: "karier", label: "Info Lowongan Kerja (Career Center)", href: "#kabar" },
    ],
  },
  {
    id: "lpm",
    label: "LPM",
    items: [
      { id: "laporan-lpm", label: "Laporan LPM", href: "#footer" },
      { id: "kegiatan-lpm", label: "Kegiatan LPM", href: "#kabar" },
    ],
  },
  { id: "laporan", label: "Laporan Tahunan Rektor", href: "#footer" },
];

function Icon({
  name,
  size = 20,
}: {
  name: "arrow" | "chevron" | "menu" | "x";
  size?: number;
}) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
  };
  const shapes = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...shared}>
      {shapes[name]}
    </svg>
  );
}

function MenuTree({
  items,
  className = "menu-tree",
  onNavigate,
  pathname,
}: {
  items: MenuNode[];
  className?: string;
  onNavigate: () => void;
  pathname: string;
}) {
  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set());

  function toggleNode(id: string) {
    setOpenNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function destination(href?: string) {
    if (!href) return "#";
    if (pathname === "/") return href;
    if (pathname === "/akademik/fakultas" && href === "#program") {
      return "#program-list";
    }
    return href === "#footer" ? href : `/${href.slice(1)}`;
  }

  return (
    <ul className={className}>
      {items.map((item) => (
        <li
          className={`menu-branch${item.children ? " has-children" : ""}${openNodes.has(item.id) ? " is-open" : ""}`}
          key={item.id}
        >
          {item.children ? (
            <button
              aria-expanded={openNodes.has(item.id)}
              className="menu-link"
              onClick={() => toggleNode(item.id)}
              type="button"
            >
              {item.label}
              <Icon name="chevron" size={15} />
            </button>
          ) : (
            <a
              className="menu-link"
              href={destination(item.href)}
              onClick={onNavigate}
            >
              {item.label}
            </a>
          )}
          {item.children && (
            <MenuTree
              className="menu-children"
              items={item.children}
              onNavigate={onNavigate}
              pathname={pathname}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function toggleMenu(id: string) {
    setActiveMenu((current) => (current === id ? null : id));
  }

  function destination(href: string) {
    return href.startsWith("#") && pathname !== "/" ? `/${href}` : href;
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link aria-label="Universitas LIA, Beranda" className="brand" href="/">
          <Image
            alt="Universitas LIA"
            className="brand-logo"
            height={37}
            priority
            src="/Logo-Universitas-LIA-scaled.png"
            width={165}
          />
        </Link>

        <button
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          type="button"
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size={22} />
        </button>

        <nav
          aria-label="Navigasi utama"
          className={`main-nav${mobileMenuOpen ? " mobile-open" : ""}`}
          onMouseLeave={() => setActiveMenu(null)}
        >
          {navigation.map((item) => (
            <div
              className={`nav-item${activeMenu === item.id || item.href === pathname ? " is-active" : ""}${item.id === "laporan" ? " nav-item-long" : ""}`}
              key={item.id}
              onMouseEnter={() => {
                if (item.items && !mobileMenuOpen) setActiveMenu(item.id);
              }}
            >
              {item.items && !item.href ? (
                <button
                  aria-expanded={activeMenu === item.id}
                  aria-haspopup="true"
                  className="nav-trigger"
                  onClick={() => {
                    if (mobileMenuOpen) toggleMenu(item.id);
                    else setActiveMenu(item.id);
                  }}
                  onFocus={() => {
                    if (!mobileMenuOpen) setActiveMenu(item.id);
                  }}
                  type="button"
                >
                  {item.label}
                  <Icon name="chevron" size={14} />
                </button>
              ) : (
                <Link
                  className="nav-trigger"
                  href={destination(item.href ?? "#kabar")}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                  {item.items && <Icon name="chevron" size={14} />}
                </Link>
              )}
              {item.items && activeMenu === item.id && (
                <div className={`nav-dropdown${item.id === "akademik" ? " academic-dropdown" : ""}`}>
                  <MenuTree
                    items={item.items}
                    onNavigate={() => {
                      setMobileMenuOpen(false);
                      setActiveMenu(null);
                    }}
                    pathname={pathname}
                  />
                </div>
              )}
            </div>
          ))}
          <Link
            className="button button-primary nav-apply"
            href={destination("#pmb")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Daftar Sekarang <Icon name="arrow" size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-footer ${className}`} id="footer">
      <div className="footer-main content-wrap">
        <div className="footer-about">
          <Link aria-label="Universitas LIA, Beranda" className="brand footer-brand" href="/">
            <Image
              alt="Universitas LIA"
              className="brand-logo"
              height={41}
              src="/Logo-Universitas-LIA-scaled.png"
              width={180}
            />
          </Link>
          <p>
            Universitas LIA adalah titik temu antara teknologi dan kepakaran
            dalam pengajaran bahasa asing.
          </p>
          <div className="social-links">
            <a aria-label="Instagram" href="#footer">ig</a>
            <a aria-label="YouTube" href="#footer">▶</a>
            <a aria-label="LinkedIn" href="#footer">in</a>
          </div>
        </div>
        <div className="footer-column">
          <h3>Universitas</h3>
          <Link href="/#tentang">Profil Universitas</Link>
          <Link href="/#footer">LPPM</Link>
          <Link href="/#footer">LPM</Link>
          <Link href="/#footer">Alumni</Link>
          <Link href="/#footer">Laporan Tahunan Rektor</Link>
        </div>
        <div className="footer-column">
          <h3>Informasi &amp; layanan</h3>
          <Link href="/akademik/fakultas">Akademik</Link>
          <Link href="/#pmb">Penerimaan Mahasiswa Baru</Link>
          <Link href="/#footer">SIAKAD UL</Link>
          <Link href="/#footer">Edlink</Link>
          <Link href="/#footer">Perpustakaan Universitas LIA</Link>
        </div>
        <div className="footer-column footer-contact">
          <h3>Hubungi kami</h3>
          <p>Alamat: Jl. Pengadegan Timur Raya No.3</p>
          <p>Email: humas@universitaslia.ac.id</p>
          <p>WhatsApp: 0858-8103-6948</p>
        </div>
      </div>
      <div className="footer-bottom content-wrap">
        <small>© Universitas LIA. Seluruh hak cipta dilindungi.</small>
        <div>
          <Link href="/#footer">Kebijakan Privasi</Link>
          <Link href="/#footer">Peta Situs</Link>
        </div>
      </div>
    </footer>
  );
}
