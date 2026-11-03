import Link from "next/link";
import "./program-page.css";
import type { HumanioraProgram } from "./program-data";

function ProgramHero({ program }: { program: HumanioraProgram }) {
  return (
    <section aria-labelledby="program-title" className="hdProgramHero">
      <nav aria-label="Breadcrumb" className="hdProgramBreadcrumbs">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">›</span>
        <span>Akademik</span>
        <span aria-hidden="true">›</span>
        <Link href="/akademik/fakultas">Fakultas</Link>
        <span aria-hidden="true">›</span>
        <Link href="/akademik/programstudi/humanioradesain">Humaniora dan Desain</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{program.shortName}</span>
      </nav>
      <span className="hdProgramEyebrow">PROGRAM STUDI</span>
      <h1 id="program-title">{program.title}</h1>
      <p>Program studi Fakultas Humaniora dan Desain Universitas LIA.</p>
    </section>
  );
}

function ProgramSummary({ program }: { program: HumanioraProgram }) {
  return (
    <aside aria-label="Informasi program studi" className="hdProgramSummaryCard">
      <span className="hdProgramSummaryLevel">{program.level}</span>
      <h2>Humaniora dan Desain</h2>
      <p className="hdProgramSummaryLabel">Akreditasi</p>
      <p className="hdProgramAccreditation">{program.accreditation}</p>
      {program.accreditationNote && (
        <p className="hdProgramAccreditationNote">{program.accreditationNote}</p>
      )}
    </aside>
  );
}

function ProgramInformationCards({ program }: { program: HumanioraProgram }) {
  return (
    <>
      <div className="hdProgramInformationGrid">
        {program.informationCards.map((card) => (
          <article className="hdProgramInformationCard" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
      <p className="hdProgramGraduatesNote">{program.graduates}</p>
    </>
  );
}

function OfficialSources({ sources }: { sources: string[] }) {
  return (
    <div aria-label="Sumber resmi" className="hdProgramSources">
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
    <section aria-labelledby="admission-title" className="hdProgramAdmissionCallout">
      <div>
        <h2 id="admission-title">Tertarik bergabung dengan Universitas LIA?</h2>
        <p>
          Informasi penerimaan mahasiswa baru: https://www.universitaslia.ac.id/pmb/
        </p>
      </div>
      <Link href="/pmb">
        Informasi PMB
        <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
          <path
            d="M2.5 8h10m-4-4 4 4-4 4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </section>
  );
}

export function ProgramPage({ program }: { program: HumanioraProgram }) {
  return (
    <>
      <ProgramHero program={program} />
      <main className="hdProgramContent">
        <section aria-labelledby="program-about-title" className="hdProgramOverview">
          <div className="hdProgramOverviewCopy">
            <h2 id="program-about-title">Tentang program studi</h2>
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
