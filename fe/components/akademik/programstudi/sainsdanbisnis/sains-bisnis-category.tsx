import Link from "next/link";
import { sainsBisnisPrograms } from "./program-data";
import "./sains-bisnis-category.css";

export function SainsBisnisCategory() {
  return (
    <>
      <section aria-labelledby="sains-bisnis-title" className="sbCategoryHero">
        <nav aria-label="Breadcrumb" className="sbCategoryBreadcrumbs">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">›</span>
          <span>Akademik</span>
          <span aria-hidden="true">›</span>
          <Link href="/akademik/fakultas">Fakultas</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Sains dan Bisnis</span>
        </nav>
        <span className="sbCategoryEyebrow">FAKULTAS UNIVERSITAS LIA</span>
        <h1 id="sains-bisnis-title">Sains dan Bisnis</h1>
        <p>
          Fakultas Sains dan Bisnis menaungi tiga program studi: Bisnis Digital,
          Informatika, dan Sistem Informasi.
        </p>
      </section>

      <div className="sbCategoryContent">
        <section aria-label="Fakultas Sains dan Bisnis" className="sbCategoryBanner">
          <span className="sbCategoryBannerPanel sbCategoryBannerPanelBusiness" />
          <span className="sbCategoryBannerPanel sbCategoryBannerPanelComputer" />
          <span className="sbCategoryBannerPanel sbCategoryBannerPanelScience" />
          <div className="sbCategoryBannerCopy">
            <span>FAKULTAS</span>
            <h2>Sains dan Bisnis</h2>
            <p>Teknologi, informasi, dan bisnis digital.</p>
          </div>
        </section>

        <section aria-labelledby="sains-bisnis-programs-title" className="sbCategoryProgramList">
          <h2 id="sains-bisnis-programs-title">Program studi</h2>
          <div className="sbCategoryProgramGrid">
            {sainsBisnisPrograms.map((program) => (
              <article className="sbCategoryProgramCard" key={program.href}>
                <span>{program.level}</span>
                <h3>{program.label}</h3>
                <Link href={program.href}>Lihat program studi →</Link>
              </article>
            ))}
          </div>
        </section>

        <div aria-label="Sumber resmi" className="sbCategorySources">
          <span>Sumber resmi</span>
          <a href="https://www.universitaslia.ac.id/" rel="noreferrer" target="_blank">
            https://www.universitaslia.ac.id/
          </a>
          <a href="https://www.universitaslia.ac.id/pmb/" rel="noreferrer" target="_blank">
            https://www.universitaslia.ac.id/pmb/
          </a>
        </div>

        <section aria-labelledby="sb-category-admission-title" className="sbCategoryAdmission">
          <div>
            <h2 id="sb-category-admission-title">Tertarik bergabung dengan Universitas LIA?</h2>
            <p>Informasi penerimaan mahasiswa baru: https://www.universitaslia.ac.id/pmb/</p>
          </div>
          <Link href="/pmb">Informasi PMB →</Link>
        </section>
      </div>
    </>
  );
}
