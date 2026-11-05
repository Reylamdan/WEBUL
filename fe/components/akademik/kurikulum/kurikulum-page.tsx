import Link from "next/link";
import { FacultyContactButton } from "@/components/akademik/faculty-contact-button";
import { curriculumPrograms } from "./kurikulum-data";
import "./kurikulum.css";

function CurriculumHero() {
  return (
    <section aria-labelledby="curriculum-title" className="curriculum-hero">
      <nav aria-label="Breadcrumb" className="curriculum-breadcrumb">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">›</span>
        <span>Akademik</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Kurikulum</span>
      </nav>
      <span className="curriculum-eyebrow">AKADEMIK UNIVERSITAS LIA</span>
      <h1 id="curriculum-title">Kurikulum</h1>
      <p>
        Informasi tentang pendekatan, struktur, dan arah pembelajaran di
        Universitas LIA. Rincian kurikulum mengikuti program studi dan dokumen
        akademik resmi.
      </p>
    </section>
  );
}

function AcademicSectionNavigation() {
  return (
    <nav aria-label="Navigasi Akademik" className="curriculum-section-nav">
      <Link aria-current="page" href="/akademik/kurikulum">
        Kurikulum <span aria-hidden="true">⌄</span>
      </Link>
      <Link href="/akademik/fakultas">
        Fakultas <span aria-hidden="true">⌄</span>
      </Link>
      <Link href="/#kabar">
        Kalender Akademik <span aria-hidden="true">⌄</span>
      </Link>
      <Link href="/#kehidupan">
        Kemahasiswaan <span aria-hidden="true">⌄</span>
      </Link>
      <Link href="/#program">
        Layanan Akademik <span aria-hidden="true">⌄</span>
      </Link>
    </nav>
  );
}

function OutcomeBasedEducation() {
  return (
    <section aria-labelledby="obe-title" className="curriculum-obe">
      <div className="curriculum-obe-copy">
        <span aria-hidden="true" className="curriculum-obe-icon">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M12 3.5 14 5l2.5-.2.7 2.4 2.2 1.2-.7 2.4.7 2.4-2.2 1.2-.7 2.4L14 17l-2 1.5L10 17l-2.5.2-.7-2.4-2.2-1.2.7-2.4-.7-2.4 2.2-1.2.7-2.4L10 5l2-1.5Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="m9.2 11.8 1.8 1.8 3.8-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <div>
          <h2 id="obe-title">Outcome-Based Education (OBE)</h2>
          <p className="curriculum-obe-lead">
            Capaian pembelajaran sebagai arah perancangan mata kuliah.
          </p>
          <p>
            Kurikulum mengembangkan pengetahuan, keterampilan, dan sikap yang
            dibutuhkan lulusan.
          </p>
        </div>
      </div>
      <aside aria-label="Ilustrasi pendekatan pembelajaran OBE" className="curriculum-obe-visual">
        <h3>Pendekatan pembelajaran Outcome-Based Education (OBE)</h3>
        <div aria-hidden="true" className="curriculum-obe-diagram">
          <span className="curriculum-obe-node curriculum-obe-node-top" />
          <span className="curriculum-obe-node curriculum-obe-node-left" />
          <span className="curriculum-obe-node curriculum-obe-node-center">
            OBE
          </span>
          <span className="curriculum-obe-node curriculum-obe-node-right" />
          <span className="curriculum-obe-node curriculum-obe-node-bottom" />
        </div>
      </aside>
    </section>
  );
}

function CurriculumTable() {
  return (
    <section
      aria-labelledby="curriculum-programs-title"
      className="curriculum-programs"
      id="komponen-kurikulum"
    >
      <span className="curriculum-eyebrow">STRUKTUR KURIKULUM</span>
      <h2 id="curriculum-programs-title">Komponen pembelajaran program studi</h2>
      <p className="curriculum-programs-intro">
        Gambaran umum fokus pembelajaran setiap program studi. Untuk rincian
        mata kuliah, rujuk dokumen kurikulum resmi program studi.
      </p>
      <div className="curriculum-table-scroll" role="region" aria-label="Tabel kurikulum program studi" tabIndex={0}>
        <table className="curriculum-table">
          <caption className="curriculum-sr-only">
            Fokus pembelajaran dan komponen kurikulum setiap program studi
          </caption>
          <thead>
            <tr>
              <th scope="col">Program Studi</th>
              <th scope="col">Fokus pembelajaran</th>
              <th scope="col">Komponen kurikulum</th>
            </tr>
          </thead>
          <tbody>
            {curriculumPrograms.map((program) => (
              <tr key={program.href}>
                <th scope="row">
                  <Link href={program.href}>{program.name}</Link>
                </th>
                <td>{program.focus}</td>
                <td>{program.components}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="curriculum-table-note">
        Catatan: rincian mata kuliah dapat berbeda menurut program studi dan
        periode kurikulum.
      </p>
    </section>
  );
}

export function KurikulumPage() {
  return (
    <main className="curriculum-page">
      <CurriculumHero />
      <AcademicSectionNavigation />
      <div className="curriculum-content">
        <OutcomeBasedEducation />
        <CurriculumTable />
      </div>
      <FacultyContactButton />
    </main>
  );
}
