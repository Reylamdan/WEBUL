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
    href: "/profil",
    items: [
      { id: "sejarah", label: "Sejarah", href: "/profil/sejarah" },
      { id: "visi", label: "Visi & Misi", href: "/profil/visi-misi" },
      { id: "struktur", label: "Struktur Organisasi", href: "/profil/struktur-organisasi" },
      { id: "akreditasi", label: "Akreditasi", href: "/profil/akreditasi" },
      { id: "fasilitas", label: "Fasilitas Kampus", href: "/profil/fasilitas-kampus" },
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
            href: "/akademik/programstudi/humanioradesain",
            children: [
              { id: "desain", label: "S1 Desain Komunikasi Visual", href: "/akademik/programstudi/humanioradesain/s1-dkv" },
              { id: "jepang", label: "S1 Bahasa Jepang", href: "/akademik/programstudi/humanioradesain/s1-bjepang" },
              { id: "inggris-d3", label: "D3 Bahasa Inggris", href: "/akademik/programstudi/humanioradesain/d3-bing" },
              { id: "inggris-s1", label: "S1 Bahasa Inggris", href: "/akademik/programstudi/humanioradesain/s1-bing" },
            ],
          },
          {
            id: "bisnis",
            label: "Sains dan Bisnis",
            href: "/akademik/programstudi/sainsdanbisnis",
            children: [
              { id: "digital", label: "S1 Bisnis Digital", href: "/akademik/programstudi/sainsdanbisnis/s1-bisnis-digital" },
              { id: "informatika", label: "S1 Informatika", href: "/akademik/programstudi/sainsdanbisnis/s1-informatika" },
              { id: "informasi", label: "S1 Sistem Informasi", href: "/akademik/programstudi/sainsdanbisnis/s1-sistem-informasi" },
            ],
          },
        ],
      },
      { id: "akreditasi", label: "Akreditasi Program Studi", href: "/akademik/akreditasi" },
      { id: "kalender", label: "Kalender Akademik", href: "/akademik/kalender-akademik" },
      { id: "kurikulum", label: "Kurikulum", href: "/akademik/kurikulum" },
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
      { id: "ukm", label: "Kegiatan Mahasiswa (UKM)", href: "/kehidupan-kampus/kegiatan-mahasiswa" },
      { id: "berita", label: "Berita Terkini", href: "/kehidupan-kampus/berita-terkini" },
      { id: "pengumuman", label: "Pengumuman", href: "/#kabar" },
      { id: "agenda", label: "Agenda Acara", href: "/#kabar" },
    ],
  },
  {
    id: "alumni",
    label: "Alumni",
    href: "/alumni",
    items: [
      { id: "ikatan", label: "Ikatan Alumni", href: "/alumni/ikatan-alumni" },
      { id: "tracer", label: "Tracer Study (Kuesioner Alumni)", href: "/alumni/tracer-study" },
      { id: "karier", label: "Info Lowongan Kerja (Career Center)", href: "/alumni/career-center" },
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
      { id: "lpm-manajemen-arsip", label: "Manajemen Arsip", href: "/lpm/manajemen-arsip" },
    ],
  },
  {
    id: "laporan",
    label: "Laporan Tahunan Rektor",
    href: "/laporan-tahunan-rektor",
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
  function resolveHref(href?: string) {
    if (!href) return "#";
    if (href.startsWith("/")) return href;
    if (pathname === "/") return href;
    return `/${href}`;
  }

  function isNodeActive(item: MenuNode): boolean {
    if (item.href) {
      const href = resolveHref(item.href);
      if (pathname === href || pathname.startsWith(`${href}/`)) return true;
    }
    return item.children?.some(isNodeActive) ?? false;
  }

  function getActiveNodeIds(nodes: MenuNode[]): Set<string> {
    const activeIds = new Set<string>();
    for (const node of nodes) {
      if (isNodeActive(node)) activeIds.add(node.id);
      if (node.children) {
        for (const id of getActiveNodeIds(node.children)) activeIds.add(id);
      }
    }
    return activeIds;
  }

  const [openNodes, setOpenNodes] = useState<Set<string>>(() => getActiveNodeIds(items));
  const activeNodeIds = getActiveNodeIds(items);

  function toggleNode(id: string) {
    setOpenNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className={className}>
      {items.map((item) => (
        <li
          className={`menu-branch${item.children ? " has-children" : ""}${openNodes.has(item.id) || activeNodeIds.has(item.id) ? " is-open" : ""}`}
          key={item.id}
        >
          {item.children ? (
            <div className="menu-link menu-link-branch">
              {item.href ? (
                <Link
                  aria-current={pathname === resolveHref(item.href) ? "page" : undefined}
                  className={`menu-link-label${isNodeActive(item) ? " is-active" : ""}`}
                  href={resolveHref(item.href)}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="menu-link-label">{item.label}</span>
              )}
              <button
                aria-expanded={openNodes.has(item.id) || activeNodeIds.has(item.id)}
                aria-label={`${openNodes.has(item.id) || activeNodeIds.has(item.id) ? "Tutup" : "Buka"} submenu ${item.label}`}
                className="menu-link-toggle"
                onClick={() => toggleNode(item.id)}
                type="button"
              >
                <Icon name="chevron" size={14} />
              </button>
            </div>
          ) : (
            <Link
              aria-current={pathname === resolveHref(item.href) ? "page" : undefined}
              className={`menu-link${isNodeActive(item) ? " is-active" : ""}`}
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
  const [isFloating, setIsFloating] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;

    function updateFloatingState() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        setIsFloating((current) => {
          if (!current && scrollY > 56) return true;
          if (current && scrollY < 12) return false;
          return current;
        });
      });
    }

    updateFloatingState();
    window.addEventListener("scroll", updateFloatingState, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateFloatingState);
    };
  }, []);

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
    if (pathname === "/") {
      return item.id === "beranda";
    }
    if (item.id === "beranda") {
      return false;
    }
    if (item.id === "profil") {
      return pathname.startsWith("/profil");
    }
    if (item.id === "akademik") {
      return pathname.startsWith("/akademik");
    }
    if (item.id === "kehidupan") {
      return pathname.startsWith("/kehidupan-kampus");
    }
    if (item.id === "lpm") {
      return pathname.startsWith("/lpm");
    }
    if (item.id === "lppm") {
      return pathname.startsWith("/lppm");
    }
    if (item.id === "pmb") {
      return pathname.startsWith("/pmb");
    }
    if (item.id === "laporan") {
      return pathname.startsWith("/laporan-tahunan-rektor");
    }
    if (item.id === "alumni") {
      return pathname.startsWith("/alumni");
    }
    if (item.href && item.href.startsWith("/") && item.href !== "/" && pathname.startsWith(item.href)) {
      return true;
    }
    if (item.items) {
      const hasActiveChild = (nodes: MenuNode[]): boolean => {
        return nodes.some((node) => {
          if (node.href && node.href.startsWith("/")) {
            const pathOnly = node.href.split("#")[0];
            if (pathOnly && pathOnly !== "/" && (pathname === pathOnly || pathname.startsWith(`${pathOnly}/`))) {
              return true;
            }
          }
          return node.children ? hasActiveChild(node.children) : false;
        });
      };
      if (hasActiveChild(item.items)) {
        return true;
      }
    }
    return activeMenu === item.id;
  }

  return (
    <header className={`site-header${isFloating ? " is-floating" : ""}`}>
      <div className="header-inner">
        <div className="header-top-row">
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
          <div className="header-meta-actions">
            <div aria-label="Pilih Bahasa" className="lang-switcher" role="group">
              <button
                className={`lang-btn${lang === "ID" ? " is-active" : ""}`}
                onClick={() => setLang("ID")}
                type="button"
              >
                ID
              </button>
              <button
                className={`lang-btn${lang === "EN" ? " is-active" : ""}`}
                onClick={() => setLang("EN")}
                type="button"
              >
                EN
              </button>
            </div>

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
          </div>

          <button
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name={mobileMenuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>

        <nav
          aria-label="Navigasi utama"
          className={`main-nav${mobileMenuOpen ? " mobile-open" : ""}`}
          onMouseLeave={(event) => {
            if (event.relatedTarget instanceof Node && navRef.current?.contains(event.relatedTarget)) {
              return;
            }
            setActiveMenu(null);
          }}
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
                ) : item.items ? (
                  <div className="nav-trigger nav-trigger-with-toggle">
                    <Link
                      className="nav-trigger-link"
                      href={resolveHref(item.href)}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveMenu(null);
                      }}
                    >
                      {item.label}
                    </Link>
                    <button
                      aria-expanded={activeMenu === item.id}
                      aria-label={`${activeMenu === item.id ? "Tutup" : "Buka"} submenu ${item.label}`}
                      className="nav-trigger-toggle"
                      onClick={() => toggleMenu(item.id)}
                      type="button"
                    >
                      <Icon name="chevron" size={14} />
                    </button>
                  </div>
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

          <Link
            className="button button-primary nav-apply"
            href="/pmb"
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
          <Link href="/profil">Profil Universitas</Link>
          <Link href="/#footer">LPPM</Link>
          <Link href="/#footer">LPM</Link>
          <Link href="/#footer">Alumni</Link>
          <Link href="/laporan-tahunan-rektor">Laporan Tahunan Rektor</Link>
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
