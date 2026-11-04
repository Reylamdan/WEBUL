import { ScrollReveal } from "@/components/scroll-reveal";
import { facultyCards, facultyPrograms } from "./faculty-data";
import { FacultyCard, FacultyProgramCard } from "./faculty-card";

export function FacultyContent() {
  return (
    <ScrollReveal delay={70}>
      <section
        aria-labelledby="faculty-program-title"
        className="faculty-programs faculty-wrap"
        id="program-studi"
      >
        <div className="faculty-section-heading">
          <span className="faculty-eyebrow">FAKULTAS DAN PROGRAM STUDI</span>
          <h2 id="faculty-program-title">Temukan bidang studi Anda</h2>
          <p>
            Pilihan program diploma dan sarjana dalam bahasa, desain, sains, dan
            bisnis.
          </p>
        </div>

        <div className="faculty-card-grid">
          {facultyCards.map((faculty, index) => (
            <FacultyCard
              delay={(index % 4) * 70}
              faculty={faculty}
              key={faculty.name}
            />
          ))}
        </div>

        <div
          aria-label="Program studi"
          className="faculty-program-grid"
          id="program-list"
        >
          {facultyPrograms.map((program, index) => (
            <FacultyProgramCard
              delay={(index % 4) * 70}
              key={`${program.level}-${program.name}`}
              program={program}
            />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
