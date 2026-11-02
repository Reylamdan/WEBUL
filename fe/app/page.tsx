"use client";

import Image from "next/image";
import { useState } from "react";
<<<<<<< Updated upstream

type IconName =
  | "arrow"
  | "book"
  | "calendar"
  | "chevron"
  | "file"
  | "globe"
  | "graduate"
  | "menu"
  | "message"
  | "monitor"
  | "play"
  | "sparkle"
  | "x";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
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
    book: (
      <>
        <path d="M12 7v14" />
        <path d="M3 18V5.8a1 1 0 0 1 1.2-1L12 6.5l7.8-1.7a1 1 0 0 1 1.2 1V18l-9 2-9-2Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
    graduate: (
      <>
        <path d="m2 10 10-5 10 5-10 5-10-5Z" />
        <path d="M6 12v5c3.5 3 8.5 3 12 0v-5M22 10v6" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      </>
    ),
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </>
    ),
    play: <path d="m9 6 10 6-10 6V6Z" />,
    sparkle: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1 1-2.5Z" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...shared}
    >
      {shapes[name]}
    </svg>
  );
}

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
  { id: "pmb", label: "PMB", items: [
    { id: "jalur", label: "Jalur Pendaftaran", href: "#pmb" },
    { id: "biaya", label: "Biaya Kuliah", href: "#pmb" },
    { id: "beasiswa", label: "Beasiswa", href: "#pmb" },
  ] },
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
  { id: "lpm", label: "LPM", items: [
    { id: "laporan-lpm", label: "Laporan LPM", href: "#footer" },
    { id: "kegiatan-lpm", label: "Kegiatan LPM", href: "#kabar" },
  ] },
  { id: "laporan", label: "Laporan Tahunan Rektor", href: "#footer" },
];

function MenuTree({
  items,
  className = "menu-tree",
  onNavigate,
}: {
  items: MenuNode[];
  className?: string;
  onNavigate?: () => void;
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
            <a className="menu-link" href={item.href ?? "#"} onClick={onNavigate}>
              {item.label}
            </a>
          )}
          {item.children && (
            <MenuTree
              className="menu-children"
              items={item.children}
              onNavigate={onNavigate}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

const quickLinks = [
  { name: "SIAKAD UL", detail: "Sistem informasi akademik", icon: "graduate" as const },
  { name: "E-Learning", detail: "Pembelajaran melalui Edlink", icon: "monitor" as const },
  { name: "Perpustakaan", detail: "Sumber belajar dan referensi", icon: "book" as const },
  { name: "Informasi PMB", detail: "Panduan calon mahasiswa", icon: "file" as const },
  { name: "E-Journal", detail: "Publikasi ilmiah dan jurnal", icon: "book" as const },
];

const programs = [
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Desain Komunikasi Visual", code: "S1 · 8 semester", color: "coral" },
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Inggris", code: "S1 · 8 semester", color: "blue" },
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Jepang", code: "S1 · 8 semester", color: "yellow" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Bisnis Digital", code: "S1 · 8 semester", color: "green" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Sistem Informasi", code: "S1 · 8 semester", color: "lavender" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Informatika", code: "S1 · 8 semester", color: "orange" },
];

const stories = [
  {
    tag: "KABAR KAMPUS",
    title: "Kreativitas mahasiswa hadir di ruang kolaborasi kampus",
    date: "12 Juni 2025",
    image: "story-art",
  },
  {
    tag: "PRESTASI",
    title: "Mahasiswa Universitas LIA raih prestasi di tingkat nasional",
    date: "8 Juni 2025",
    image: "story-students",
  },
  {
    tag: "KEGIATAN",
    title: "Belajar bahasa dan budaya melalui pengalaman langsung",
    date: "2 Juni 2025",
    image: "story-language",
  },
];

function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow?: string;
  title: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && (
        <a className="text-link" href="#kabar">
          {link} <Icon name="arrow" size={16} />
        </a>
      )}
    </div>
  );
}
=======
import { Icon } from "@/components/icons";
import {
  AboutSection,
  AdmissionBanner,
  CampusLifeSection,
  HeroSection,
  NewsSection,
  PartnersSection,
  ProgramSection,
  QuickLinks,
  UpdatesSection,
  VideoModal,
} from "@/components/landing";
>>>>>>> Stashed changes

export default function Home() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  function toggleMenu(id: string) {
    setActiveMenu((current) => (current === id ? null : id));
  }

  return (
    <main>
<<<<<<< Updated upstream
      <header className="site-header">
        <div className="header-inner">
          <a aria-label="Universitas LIA, Beranda" className="brand" href="#">
            <Image
              alt="Universitas LIA"
              className="brand-logo"
              height={37}
              priority
              src="/Logo-Universitas-LIA-scaled.png"
              width={165}
            />
          </a>

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
                className={`nav-item${activeMenu === item.id ? " is-active" : ""}${item.id === "laporan" ? " nav-item-long" : ""}`}
                key={item.id}
                onMouseEnter={() => {
                  if (item.items && !mobileMenuOpen) setActiveMenu(item.id);
                }}
              >
                {item.items ? (
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
                  <a
                    className="nav-trigger"
                    href={item.href ?? "#kabar"}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )}
                {item.items && activeMenu === item.id && (
                  <div className={`nav-dropdown${item.id === "akademik" ? " academic-dropdown" : ""}`}>
                    <MenuTree
                      items={item.items}
                      onNavigate={() => {
                        setMobileMenuOpen(false);
                        setActiveMenu(null);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            <a
              className="button button-primary nav-apply"
              href="#pmb"
              onClick={() => setMobileMenuOpen(false)}
            >
              Daftar Sekarang <Icon name="arrow" size={16} />
            </a>
          </nav>
        </div>
      </header>

      <section aria-label="Layanan kampus" className="quick-links">
        <div className="quick-links-inner">
          {quickLinks.map((item) => (
            <a className="quick-link" href="#footer" key={item.name}>
              <span className="quick-icon"><Icon name={item.icon} size={25} /></span>
              <span className="quick-copy">
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="quick-arrow"><Icon name="arrow" size={15} /></span>
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="hero-title" className="hero">
        <div className="hero-backdrop">
          <div className="hero-shape hero-shape-one" />
          <div className="hero-shape hero-shape-two" />
          <span className="hero-image-note">KAMPUS UNIVERSITAS LIA · VIDEO PREVIEW</span>
          <button
            aria-label="Putar video kampus"
            className="hero-play"
            onClick={() => setVideoOpen(true)}
            type="button"
          >
            <Icon name="play" size={22} />
          </button>
          <span className="hero-caption">Tempat ide tumbuh dan masa depan dimulai</span>
        </div>
        <div className="hero-content">
          <span className="eyebrow eyebrow-light">UNIVERSITAS LIA</span>
          <h1 id="hero-title">Empowering Minds,<br />Inspiring Futures.</h1>
          <p>
            Belajar bahasa, teknologi, dan bisnis bersama komunitas yang
            mendukungmu tumbuh dan siap menghadapi dunia.
          </p>
          <div className="hero-actions">
            <a className="button button-light" href="#program">
              Temukan program studi <Icon name="arrow" size={16} />
            </a>
            <a className="hero-secondary-link" href="#tentang">
              Kenali Universitas LIA
            </a>
          </div>
        </div>
        <div className="hero-pagination">
          <span className="pagination-active" />
          <span />
          <span />
          <small>01 <i>/</i> 03</small>
        </div>
      </section>

      <section className="intro-section content-wrap" id="tentang">
        <div className="intro-copy">
          <span className="eyebrow">TENTANG UNIVERSITAS LIA</span>
          <h2>Transformasi STIA LIA menjadi Universitas LIA</h2>
          <p className="section-lead">
            Perjalanan baru untuk menghadirkan pendidikan yang relevan,
            inklusif, dan siap menjawab kebutuhan masa depan.
          </p>
          <ul className="value-list">
            <li><span><Icon name="sparkle" size={17} /></span><div><strong>Pendidikan berkualitas</strong><small>Belajar dari pengajar berpengalaman</small></div></li>
            <li><span><Icon name="globe" size={17} /></span><div><strong>Wawasan global</strong><small>Bekal untuk berkiprah tanpa batas</small></div></li>
            <li><span><Icon name="graduate" size={17} /></span><div><strong>Siap menghadapi masa depan</strong><small>Kompetensi yang relevan dengan industri</small></div></li>
          </ul>
          <a className="text-link" href="#kehidupan">
            Tentang Universitas LIA <Icon name="arrow" size={16} />
          </a>
        </div>
        <div className="intro-media">
          <div className="intro-media-art">
            <span className="art-sun" />
            <span className="art-building art-building-one" />
            <span className="art-building art-building-two" />
            <span className="art-ground" />
            <span className="art-label">LEARNING<br />WITHOUT LIMITS</span>
          </div>
          <span className="media-caption"><Icon name="play" size={13} /> Cerita Universitas LIA</span>
        </div>
      </section>

      <section className="program-section content-wrap" id="program">
        <SectionHeading
          eyebrow="TEMUKAN MINATMU"
          title="Belajar sesuatu yang berarti"
          link="Lihat semua program"
        />
        <p className="section-lead program-lead">
          Pilih program yang sesuai dengan rasa ingin tahu dan cita-citamu.
        </p>
        <div className="program-grid">
          {programs.map((program, index) => (
            <article className={`program-card program-${program.color}`} key={program.title}>
              <div className="program-card-top">
                <span className="program-number">0{index + 1}</span>
                <span className="program-card-icon"><Icon name={index < 3 ? "globe" : "sparkle"} size={20} /></span>
              </div>
              <span className="program-eyebrow">{program.eyebrow}</span>
              <h3>{program.title}</h3>
              <div className="program-card-bottom">
                <span>{program.code}</span>
                <a aria-label={`Pelajari ${program.title}`} href="#pmb"><Icon name="arrow" size={18} /></a>
              </div>
            </article>
          ))}
        </div>
        <a className="text-link programs-mobile-link" href="#pmb">
          Lihat semua program <Icon name="arrow" size={16} />
        </a>
      </section>

      <section className="news-section" id="kabar">
        <div className="content-wrap">
          <SectionHeading
            eyebrow="CERITA DARI KAMPUS"
            title="Kabar dan inspirasi"
            link="Semua kabar"
          />
          <div className="story-grid">
            {stories.map((story) => (
              <article className="story-card" key={story.title}>
                <a aria-label={`Baca ${story.title}`} className={`story-image ${story.image}`} href="#kehidupan">
                  <span className="story-image-tag">{story.tag}</span>
                  <span className="story-image-decoration" />
                </a>
                <div className="story-meta"><span>{story.tag}</span><time>{story.date}</time></div>
                <h3><a href="#kehidupan">{story.title}</a></h3>
                <a className="story-read-more" href="#kehidupan">
                  Baca selengkapnya <Icon name="arrow" size={15} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="updates-section content-wrap">
        <div className="update-column">
          <SectionHeading title="Pengumuman" link="Lihat semua" />
          <a className="update-item" href="#kabar">
            <span className="update-date"><strong>18</strong><small>JUN</small></span>
            <span className="update-copy"><small>AKADEMIK</small><strong>Jadwal registrasi semester ganjil 2025/2026</strong></span>
            <Icon name="arrow" size={17} />
          </a>
          <a className="update-item" href="#kabar">
            <span className="update-date"><strong>12</strong><small>JUN</small></span>
            <span className="update-copy"><small>KEMAHASISWAAN</small><strong>Pendaftaran kegiatan orientasi mahasiswa baru</strong></span>
            <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="update-column">
          <SectionHeading title="Agenda kampus" link="Lihat semua" />
          <a className="update-item" href="#kehidupan">
            <span className="update-date"><strong>24</strong><small>JUN</small></span>
            <span className="update-copy"><small>ACARA KAMPUS</small><strong>Open House Universitas LIA — Kenali kampusmu</strong></span>
            <Icon name="arrow" size={17} />
          </a>
          <a className="update-item" href="#kehidupan">
            <span className="update-date"><strong>02</strong><small>JUL</small></span>
            <span className="update-copy"><small>WORKSHOP</small><strong>Creative talk: ide sederhana, dampak luar biasa</strong></span>
            <Icon name="arrow" size={17} />
          </a>
        </div>
      </section>

      <section className="campus-life-section content-wrap" id="kehidupan">
        <div className="campus-life-image">
          <span className="life-art-person life-person-one" />
          <span className="life-art-person life-person-two" />
          <span className="life-art-table" />
          <span className="life-photo-label">HARI-HARI DI KAMPUS</span>
        </div>
        <div className="campus-life-copy">
          <span className="eyebrow">LEBIH DARI RUANG KELAS</span>
          <h2>Jalani pengalaman kampus yang penuh cerita</h2>
          <p>
            Temukan teman, kembangkan minat, dan ciptakan pengalaman berharga
            bersama komunitas Universitas LIA.
          </p>
          <a className="text-link" href="#footer">
            Jelajahi kehidupan kampus <Icon name="arrow" size={16} />
          </a>
        </div>
      </section>

      <section className="admission-banner" id="pmb">
        <div className="admission-inner">
          <div>
            <span className="eyebrow eyebrow-light">PENERIMAAN MAHASISWA BARU</span>
            <h2>When Technology Meets Language Expertise.</h2>
            <p>Kenali informasi jalur pendaftaran, beasiswa, dan biaya kuliah sebelum memulai proses pendaftaran.</p>
          </div>
          <div className="admission-actions">
            <a className="button button-light" href="#footer">
              Daftar Sekarang <Icon name="arrow" size={16} />
            </a>
            <a href="#footer">Informasi jalur pendaftaran <Icon name="arrow" size={14} /></a>
          </div>
        </div>
      </section>

      <section className="partners-section">
        <div className="content-wrap">
          <SectionHeading title="Mitra Kami" />
          <div aria-label="Logo mitra placeholder" className="partners-grid">
            {["lia", "digital", "global", "edu", "creative", "tech", "language", "future", "media", "institute", "connect", "learning"].map((partner, index) => (
              <div className="partner-logo" key={partner}>
                <span className={`partner-mark partner-mark-${index % 4}`} />
                <span>{partner}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer" id="footer">
        <div className="footer-main content-wrap">
          <div className="footer-about">
            <a aria-label="Universitas LIA, Beranda" className="brand footer-brand" href="#">
              <Image
                alt="Universitas LIA"
                className="brand-logo"
                height={41}
                src="/Logo-Universitas-LIA-scaled.png"
                width={180}
              />
            </a>
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
            <a href="#tentang">Profil Universitas</a>
            <a href="#footer">LPPM</a>
            <a href="#footer">LPM</a>
            <a href="#footer">Alumni</a>
            <a href="#footer">Laporan Tahunan Rektor</a>
          </div>
          <div className="footer-column">
            <h3>Informasi & layanan</h3>
            <a href="#program">Akademik</a>
            <a href="#pmb">Penerimaan Mahasiswa Baru</a>
            <a href="#footer">SIAKAD UL</a>
            <a href="#footer">Edlink</a>
            <a href="#footer">Perpustakaan Universitas LIA</a>
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
          <div><a href="#footer">Kebijakan Privasi</a><a href="#footer">Peta Situs</a></div>
        </div>
      </footer>

      <a aria-label="Hubungi Universitas LIA" className="chat-button" href="mailto:humas@universitaslia.ac.id">
=======
      <QuickLinks />
      <HeroSection onPlayVideo={() => setVideoOpen(true)} />
      <AboutSection />
      <ProgramSection />
      <NewsSection />
      <UpdatesSection />
      <CampusLifeSection />
      <AdmissionBanner />
      <PartnersSection />

      <a
        aria-label="Hubungi Universitas LIA"
        className="chat-button"
        href="mailto:humas@universitaslia.ac.id"
      >
>>>>>>> Stashed changes
        <Icon name="message" size={21} />
      </a>

      {videoOpen && (
        <div
          aria-labelledby="video-dialog-title"
          aria-modal="true"
          className="video-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setVideoOpen(false);
          }}
          role="dialog"
        >
          <div className="video-dialog">
            <button
              aria-label="Tutup video"
              className="video-dialog-close"
              onClick={() => setVideoOpen(false)}
              type="button"
            >
              <Icon name="x" size={20} />
            </button>
            <div className="video-dialog-placeholder"><Icon name="play" size={30} /></div>
            <h2 id="video-dialog-title">Video kampus segera hadir</h2>
            <p>Cuplikan kehidupan Universitas LIA akan ditampilkan di sini.</p>
          </div>
        </div>
      )}
    </main>
  );
}
