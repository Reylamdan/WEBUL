"use client";

import Link from "next/link";

const facultyCards = [
  {
    name: "Humaniora dan Desain",
    description: "Bahasa, budaya, dan kreativitas visual.",
    image: "faculty-humaniora",
  },
  {
    name: "Sains dan Bisnis",
    description: "Teknologi, informasi, dan bisnis digital.",
    image: "faculty-sains",
  },
];

const programs = [
  { level: "D3 · DIPLOMA", name: "Bahasa Inggris" },
  { level: "S1 · SARJANA", name: "Bahasa Inggris" },
  { level: "S1 · SARJANA", name: "Bisnis Digital" },
  { level: "S1 · SARJANA", name: "Informatika" },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path d="M2.5 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FacultiesPage() {
  return (
    <main className="faculty-page">
      <div aria-hidden="true" className="faculty-top-space" />

      <div className="faculty-content">
        <section aria-labelledby="faculty-title" className="faculty-intro faculty-wrap">
          <div className="faculty-intro-copy">
            <nav aria-label="Breadcrumb" className="faculty-breadcrumb">
              <Link href="/">Beranda</Link>
              <span aria-hidden="true">/</span>
              <span>Akademik</span>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Fakultas</span>
            </nav>
            <span className="faculty-eyebrow">PENDIDIKAN UNIVERSITAS LIA</span>
            <h1 id="faculty-title">Fakultas</h1>
            <p>
              Jelajahi fakultas dan program studi Universitas LIA, lengkap dengan
              bidang fokus, program akademik, dan akses informasi resmi.
            </p>
          </div>
          <div aria-hidden="true" className="faculty-intro-visual">
            <span className="faculty-intro-orbit" />
            <span className="faculty-intro-visual-label">TEMUKAN BIDANGMU</span>
          </div>
        </section>

        <section
          aria-labelledby="faculty-program-title"
          className="faculty-programs faculty-wrap"
          id="program-studi"
        >
          <div className="faculty-section-heading">
            <span className="faculty-eyebrow">FAKULTAS DAN PROGRAM STUDI</span>
            <h2 id="faculty-program-title">Temukan bidang studi Anda</h2>
            <p>Pilihan program diploma dan sarjana dalam bahasa, desain, sains, dan bisnis.</p>
          </div>

          <div className="faculty-card-grid">
            {facultyCards.map((faculty) => (
              <article className={`faculty-card ${faculty.image}`} key={faculty.name}>
                <a aria-label={`Pelajari ${faculty.name}`} href="#program-list">
                  <span className="faculty-card-eyebrow">FAKULTAS</span>
                  <strong>{faculty.name}</strong>
                  <span>{faculty.description}</span>
                </a>
              </article>
            ))}
          </div>

          <div aria-label="Program studi" className="faculty-program-grid" id="program-list">
            {programs.map((program) => (
              <article className="faculty-program-card" key={`${program.level}-${program.name}`}>
                <span>{program.level}</span>
                <h3>{program.name}</h3>
                <a href="#program-list">
                  Lihat program studi <ArrowIcon />
                </a>
              </article>
            ))}
          </div>
        </section>

      </div>
      <a
        aria-label="Hubungi Universitas LIA"
        className="chat-button"
        href="mailto:humas@universitaslia.ac.id"
      >
        <svg aria-hidden="true" fill="none" height="21" viewBox="0 0 24 24" width="21">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      </a>
    </main>
  );
}
