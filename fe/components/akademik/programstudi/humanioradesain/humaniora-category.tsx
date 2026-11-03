import Link from "next/link";
import "./humaniora-category.css";
import { humanioraPrograms } from "./program-data";

export function HumanioraCategory() {
  return (
    <>
      <section
        aria-labelledby="humaniora-title"
        className="hdCategoryHero"
      >
        <nav aria-label="Breadcrumb" className="hdCategoryBreadcrumbs">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">›</span>
          <span>Akademik</span>
          <span aria-hidden="true">›</span>
          <Link href="/akademik/fakultas">Fakultas</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Humaniora dan Desain</span>
        </nav>
        <span className="hdCategoryEyebrow">FAKULTAS UNIVERSITAS LIA</span>
        <h1 id="humaniora-title">Humaniora dan Desain</h1>
        <p>
          Fakultas Humaniora dan Desain menaungi empat program studi dalam
          bidang bahasa dan desain komunikasi visual.
        </p>
      </section>

      <div className="hdCategoryContent">
        <section aria-label="Fakultas Humaniora dan Desain" className="hdCategoryBanner">
          <span className="hdCategoryBannerEyebrow">FAKULTAS</span>
          <h2>Humaniora dan Desain</h2>
          <p>Bahasa, budaya, dan kreativitas visual.</p>
        </section>

        <section aria-labelledby="program-list-title" className="hdCategoryProgramList">
          <h2 id="program-list-title">Program studi</h2>
          <div className="hdCategoryProgramGrid">
            {humanioraPrograms.map((program) => (
              <article className="hdCategoryProgramCard" key={program.href}>
                <span className="hdCategoryProgramLevel">{program.level}</span>
                <h3>{program.label}</h3>
                <Link href={program.href}>
                  Lihat program studi
                  <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M2.5 8h10m-4-4 4 4-4 4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <div aria-label="Sumber resmi" className="hdCategorySources">
          <span>Sumber resmi</span>
          <a href="https://www.universitaslia.ac.id/" rel="noreferrer" target="_blank">
            https://www.universitaslia.ac.id/
          </a>
          <a href="https://www.universitaslia.ac.id/pmb/" rel="noreferrer" target="_blank">
            https://www.universitaslia.ac.id/pmb/
          </a>
        </div>

        <section aria-labelledby="admission-title" className="hdCategoryAdmissionCallout">
          <div>
            <h2 id="admission-title">Tertarik bergabung dengan Universitas LIA?</h2>
            <p>
              Informasi penerimaan mahasiswa baru:
              https://www.universitaslia.ac.id/pmb/
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
      </div>
    </>
  );
}
