import { ScrollReveal } from "@/components/scroll-reveal";
import type { FacultyCardData, FacultyProgramData } from "./faculty-data";

export function FacultyCard({
  faculty,
  delay,
}: {
  faculty: FacultyCardData;
  delay: number;
}) {
  return (
    <ScrollReveal delay={delay}>
      <article className={`faculty-card ${faculty.image}`}>
        <a aria-label={`Pelajari ${faculty.name}`} href="#program-list">
          <span className="faculty-card-eyebrow">FAKULTAS</span>
          <strong>{faculty.name}</strong>
          <span>{faculty.description}</span>
        </a>
      </article>
    </ScrollReveal>
  );
}

export function FacultyProgramCard({
  program,
  delay,
}: {
  program: FacultyProgramData;
  delay: number;
}) {
  return (
    <ScrollReveal delay={delay}>
      <article className="faculty-program-card">
        <span>{program.level}</span>
        <h3>{program.name}</h3>
        <a href="#program-list">
          Lihat program studi
          <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
            <path
              d="M2.5 8h10m-4-4 4 4-4 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </article>
    </ScrollReveal>
  );
}
