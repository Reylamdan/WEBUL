import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "./section-heading";

export interface ProgramItem {
  eyebrow: string;
  title: string;
  code: string;
  color: string;
  href?: string;
}

const defaultPrograms: ProgramItem[] = [
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Desain Komunikasi Visual", code: "S1 · 8 semester", color: "coral", href: "/akademik/fakultas" },
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Inggris", code: "S1 · 8 semester", color: "blue", href: "/akademik/fakultas" },
  { eyebrow: "FAKULTAS HUMANIORA & DESAIN", title: "Bahasa Jepang", code: "S1 · 8 semester", color: "yellow", href: "/akademik/fakultas" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Bisnis Digital", code: "S1 · 8 semester", color: "green", href: "/akademik/fakultas" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Sistem Informasi", code: "S1 · 8 semester", color: "lavender", href: "/akademik/fakultas" },
  { eyebrow: "FAKULTAS SAINS & BISNIS", title: "Informatika", code: "S1 · 8 semester", color: "orange", href: "/akademik/fakultas" },
];

export function ProgramSection({ programs = defaultPrograms }: { programs?: ProgramItem[] }) {
  return (
    <ScrollReveal delay={210}>
    <section className="program-section content-wrap" id="program">
      <SectionHeading
        eyebrow="TEMUKAN MINATMU"
        href="/akademik/fakultas"
        link="Lihat semua program"
        title="Belajar sesuatu yang berarti"
      />
      <p className="section-lead program-lead">
        Pilih program yang sesuai dengan rasa ingin tahu dan cita-citamu.
      </p>
      <div className="program-grid">
        {programs.map((program, index) => (
          <ScrollReveal delay={(index % 4) * 70} key={program.title}>
          <article className={`program-card program-${program.color}`}>
            <div className="program-card-top">
              <span className="program-number">0{index + 1}</span>
              <span className="program-card-icon">
                <Icon name={index < 3 ? "globe" : "sparkle"} size={20} />
              </span>
            </div>
            <span className="program-eyebrow">{program.eyebrow}</span>
            <h3>{program.title}</h3>
            <div className="program-card-bottom">
              <span>{program.code}</span>
              <a aria-label={`Pelajari ${program.title}`} href={program.href ?? "#pmb"}>
                <Icon name="arrow" size={18} />
              </a>
            </div>
          </article>
          </ScrollReveal>
        ))}
      </div>
      <a className="text-link programs-mobile-link" href="/akademik/fakultas">
        Lihat semua program <Icon name="arrow" size={16} />
      </a>
    </section>
    </ScrollReveal>
  );
}
