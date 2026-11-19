import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "./section-heading";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export interface ProgramItem {
  eyebrow: string;
  title: string;
  code: string;
  color: string;
  href?: string;
}

export function ProgramSection({ content }: { content: HomepageContent["programs"] }) {
  const programs: ProgramItem[] = content.items;
  return (
    <ScrollReveal delay={210}>
    <section className="program-section content-wrap" id="program">
      <SectionHeading
        eyebrow={content.eyebrow || undefined}
        href={content.linkHref}
        link={content.linkLabel}
        title={content.title}
      />
      {content.lead ? <p className="section-lead program-lead">{content.lead}</p> : null}
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
              <SmartLink aria-label={`Pelajari ${program.title}`} href={program.href ?? "#pmb"}>
                <Icon name="arrow" size={18} />
              </SmartLink>
            </div>
          </article>
          </ScrollReveal>
        ))}
      </div>
      <SmartLink className="text-link programs-mobile-link" href={content.linkHref}>
        {content.linkLabel} <Icon name="arrow" size={16} />
      </SmartLink>
    </section>
    </ScrollReveal>
  );
}