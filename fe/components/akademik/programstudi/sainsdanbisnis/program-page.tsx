import Link from "next/link";
import type { SainsBisnisProgram } from "./program-data";
import "./program-page.css";

function ProgramHero({ program }: { program: SainsBisnisProgram }) {
  return (
    <section aria-labelledby="sbProgramTitle" className="sbProgramHero">
      <nav aria-label="Breadcrumb" className="sbProgramBreadcrumbs">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">›</span>
        <span>Akademik</span>
        <span aria-hidden="true">›</span>
        <Link href="/akademik/fakultas">Fakultas</Link>
        <span aria-hidden="true">›</span>
        <Link href="/akademik/programstudi/sainsdanbisnis">Sains dan Bisnis</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{program.title}</span>
      </nav>
      <span className="sbProgramEyebrow">PROGRAM STUDI</span>
      <h1 id="sbProgramTitle">{program.title}</h1>
      <p>Program studi Fakultas Sains dan Bisnis Universitas LIA.</p>
    </section>
  );
}

function ProgramSummary({ program }: { program: SainsBisnisProgram }) {
  return (
    <aside aria-label="Informasi program studi" className="sbProgramSummary">
      <span>{program.level}</span>
      <h2>Sains dan Bisnis</h2>
      <p>Akreditasi</p>
      <strong>{program.accreditation}</strong>
    </aside>
  );
}

function ProgramInformationCards({ program }: { program: SainsBisnisProgram }) {
  return (
    <div className="sbProgramInformationGrid">
      <article className="sbProgramInformationCard">
        <h3>Contoh mata kuliah</h3>
        <p>{program.courseExamples}</p>
      </article>
      <article className="sbProgramInformationCard">
        <h3>Profil lulusan yang dipublikasikan</h3>
        <p>{program.graduateProfiles}</p>
        <small>Profil mengacu pada halaman resmi program studi, bukan jaminan pekerjaan.</small>
      </article>
    </div>
  );
}

function OfficialSources({ sources }: { sources: string[] }) {
  return (
    <div aria-label="Sumber resmi" className="sbProgramSources">
      <span>Sumber resmi</span>
      {sources.map((source) => (
        <a href={source} key={source} rel="noreferrer" target="_blank">
          {source}
        </a>
      ))}
    </div>
  );
}

function AdmissionCallout() {
  return (
    <section aria-labelledby="sb-program-admission-title" className="sbProgramAdmission">
      <div>
        <h2 id="sb-program-admission-title">Tertarik bergabung dengan Universitas LIA?</h2>
        <p>Informasi penerimaan mahasiswa baru: https://www.universitaslia.ac.id/pmb/</p>
      </div>
      <Link href="/pmb">Informasi PMB →</Link>
    </section>
  );
}

export function SainsBisnisProgramPage({ program }: { program: SainsBisnisProgram }) {
  return (
    <>
      <ProgramHero program={program} />
      <main className="sbProgramContent">
        <section aria-labelledby="sbProgramAboutTitle" className="sbProgramOverview">
          <div>
            <h2 id="sbProgramAboutTitle">Tentang program studi</h2>
            {program.introduction.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ProgramSummary program={program} />
        </section>
        <ProgramInformationCards program={program} />
        <OfficialSources sources={program.sources} />
        <AdmissionCallout />
      </main>
    </>
  );
}
