"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export type MenuNode = {
  id: string;
  label: string;
  href?: string;
  children?: MenuNode[];
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  items?: MenuNode[];
};

export const globalNavigation: NavItem[] = [
  {
    id: "beranda",
    label: "Beranda",
    href: "/",
  },
  {
    id: "profil",
    label: "Profil",
    items: [
      { id: "profil-universitas", label: "Profil Universitas", href: "/profil" },
      { id: "sejarah", label: "Sejarah", href: "/profil/sejarah" },
      { id: "visi", label: "Visi & Misi", href: "/profil/visi-misi" },
      { id: "struktur", label: "Struktur Organisasi", href: "/profil#informasi" },
      { id: "akreditasi", label: "Akreditasi", href: "/profil#informasi" },
      { id: "fasilitas", label: "Fasilitas Kampus", href: "/#kehidupan" },
    ],
  },
  {
    id: "akademik",
    label: "Akademik",
    href: "/akademik/fakultas",
    items: [
      { id: "fakultas", label: "Daftar Fakultas", href: "/akademik/fakultas" },
      {
        id: "program-studi",
        label: "Program Studi",
        children: [
          {
            id: "humaniora",
            label: "Humaniora dan Desain",
            children: [
              { id: "desain", label: "S1 Desain Komunikasi Visual", href: "/#program" },
              { id: "jepang", label: "S1 Bahasa Jepang", href: "/#program" },
              { id: "inggris-d3", label: "D3 Bahasa Inggris", href: "/#program" },
              { id: "inggris-s1", label: "S1 Bahasa Inggris", href: "/#program" },
            ],
          },
          {
            id: "bisnis",
            label: "Sains dan Bisnis",
            children: [
              { id: "digital", label: "S1 Bisnis Digital", href: "/#program" },
              { id: "informasi", label: "S1 Sistem Informasi", href: "/#program" },
              { id: "informatika", label: "S1 Informatika", href: "/#program" },
            ],
          },
        ],
      },
      { id: "kalender", label: "Kalender Akademik", href: "/#kabar" },
      { id: "kurikulum", label: "Kurikulum", href: "/#program" },
    ],
  },
  {
    id: "pmb",
    label: "PMB",
    href: "/pmb",
  },
  {
    id: "lppm",
    label: "LPPM",
    href: "/lppm",
  },
  {
    id: "kehidupan",
    label: "Kehidupan Kampus",
    items: [
      { id: "ukm", label: "Kegiatan Mahasiswa (UKM)", href: "/#kehidupan" },
      { id: "berita", label: "Berita Terkini", href: "/#kabar" },
      { id: "pengumuman", label: "Pengumuman", href: "/#kabar" },
      { id: "agenda", label: "Agenda Acara", href: "/#kabar" },
    ],
  },
  {
    id: "alumni",
    label: "Alumni",
    items: [
      { id: "ikatan", label: "Ikatan Alumni", href: "/#footer" },
      { id: "tracer", label: "Tracer Study (Kuesioner Alumni)", href: "/#footer" },
      { id: "karier", label: "Info Lowongan Kerja (Career Center)", href: "/#kabar" },
    ],
  },
  {
    id: "lpm",
    label: "LPM",
    href: "/lpm",
    items: [
      { id: "lpm-profil", label: "Lembaga Penjaminan Mutu", href: "/lpm" },
      { id: "lpm-laporan", label: "Laporan LPM", href: "/lpm/laporan" },
      {
        id: "lpm-laporan-ami",
        label: "Laporan Tahunan Audit Mutu Internal LIA",
        href: "/lpm/laporan-tahunan-audit-mutu-internal",
      },
      {
        id: "lpm-ami-2025",
        label: "Laporan Audit Mutu Internal 2025",
        href: "/lpm/laporan-audit-mutu-internal-2025",
      },
      {
        id: "lpm-laporan-rtm",
        label: "Laporan Tahunan RTM dan RTL",
        href: "/lpm/laporan-tahunan-rtm-rtl",
      },
      {
        id: "lpm-rtm-2025",
        label: "Laporan RTM dan RTL 2025",
        href: "/lpm/laporan-rtm-rtl-2025",
      },
      { id: "lpm-kegiatan", label: "Kegiatan LPM", href: "/lpm/kegiatan" },
      { id: "lpm-benchmarking", label: "Benchmarking", href: "/lpm/benchmarking" },
    ],
  },
  {
    id: "laporan",
    label: "Laporan Tahunan Rektor",
    href: "/#footer",
  },
];

export function GlobalDropdownMenu({
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

  function resolveHref(href?: string) {
    if (!href) return "#";
    if (href.startsWith("/")) return href;
    if (pathname === "/") return href;
    return `/${href}`;
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
              <span>{item.label}</span>
              <Icon name="chevron" size={14} />
            </button>
          ) : (
            <Link
              className="menu-link"
              href={resolveHref(item.href)}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          )}
          {item.children && (
            <GlobalDropdownMenu
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
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function toggleMenu(id: string) {
    setActiveMenu((current) => (current === id ? null : id));
  }

  function resolveHref(href?: string) {
    if (!href) return "#";
    if (href.startsWith("/")) return href;
    if (pathname === "/") return href;
    return `/${href}`;
  }

  function isItemActive(item: NavItem): boolean {
    if (item.id === "beranda") {
      return pathname === "/";
    }
    if (item.id === "profil") {
      return pathname.startsWith("/profil");
    }
    if (item.id === "akademik") {
      return pathname.startsWith("/akademik");
    }
    if (item.id === "lpm") {
      return pathname.startsWith("/lpm");
    }
    if (item.href && item.href.startsWith("/") && pathname === item.href) {
      return true;
    }
    return activeMenu === item.id;
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
          ref={navRef}
        >
          {globalNavigation.map((item) => {
            const isActive = isItemActive(item);
            return (
              <div
                className={`nav-item${isActive ? " is-active" : ""}${item.id === "laporan" ? " nav-item-long" : ""}`}
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
                    href={resolveHref(item.href ?? "#kabar")}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveMenu(null);
                    }}
                  >
                    {item.label}
                    {item.items && <Icon name="chevron" size={14} />}
                  </Link>
                )}
                {item.items && (
                  <div
                    aria-hidden={activeMenu !== item.id}
                    className={`nav-dropdown${item.id === "akademik" ? " academic-dropdown" : ""}${activeMenu === item.id ? " is-open" : ""}`}
                  >
                    <GlobalDropdownMenu
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
            );
          })}

          <div className="header-meta-actions">
            {/* Language Switcher */}
            <div aria-label="Pilih Bahasa" className="lang-switcher" role="group">
              <button
                className={`lang-btn${lang === "ID" ? " is-active" : ""}`}
                onClick={() => setLang("ID")}
                type="button"
              >
                ID
              </button>
              <span aria-hidden="true" className="lang-divider">|</span>
              <button
                className={`lang-btn${lang === "EN" ? " is-active" : ""}`}
                onClick={() => setLang("EN")}
                type="button"
              >
                EN
              </button>
            </div>

            {/* Search Trigger */}
            <div className="search-wrap">
              <button
                aria-expanded={searchOpen}
                aria-label="Cari di situs"
                className="search-toggle-btn"
                onClick={() => setSearchOpen((prev) => !prev)}
                type="button"
              >
                <Icon name="search" size={18} />
              </button>
              {searchOpen && (
                <div className="header-search-box">
                  <input
                    aria-label="Kata kunci pencarian"
                    autoFocus
                    className="header-search-input"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchOpen(false);
                    }}
                    placeholder="Cari program, berita, info..."
                    type="search"
                    value={searchQuery}
                  />
                  <button
                    aria-label="Tutup pencarian"
                    className="header-search-close"
                    onClick={() => setSearchOpen(false)}
                    type="button"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Register CTA Button */}
            <Link
              className="button button-primary nav-apply"
              href="/pmb"
              onClick={() => setMobileMenuOpen(false)}
            >
              Daftar Sekarang <Icon name="arrow" size={16} />
            </Link>
          </div>
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
          <Link href="/profil">Profil Universitas</Link>
          <Link href="/#footer">LPPM</Link>
          <Link href="/#footer">LPM</Link>
          <Link href="/#footer">Alumni</Link>
          <Link href="/#footer">Laporan Tahunan Rektor</Link>
        </div>
        <div className="footer-column">
          <h3>Informasi &amp; layanan</h3>
          <Link href="/akademik/fakultas">Akademik</Link>
          <Link href="/pmb">Penerimaan Mahasiswa Baru</Link>
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
