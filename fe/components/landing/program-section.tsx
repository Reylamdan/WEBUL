import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";
import type { HomepageContent } from "@/lib/homepage-api";

export interface ProgramItem {
  eyebrow: string;
  title: string;
  code: string;
  color: string;
  href?: string;
}

// Program dikelompokkan per fakultas (memakai teks `eyebrow` dari admin) supaya
// mahasiswa bisa memindai daftar seperti membaca indeks, bukan menebak kartu warna-warni.
function groupByFaculty(items: ProgramItem[]) {
  const groups = new Map<string, ProgramItem[]>();
  for (const item of items) {
    const key = item.eyebrow || "";
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups, ([label, list]) => ({ label, items: list }));
}

export function ProgramSection({ content }: { content: HomepageContent["programs"] }) {
  const groups = groupByFaculty(content.items);

  return (
    <ScrollReveal>
      <section className="lp-section lp-programs" id="program">
        <div className="lp-wrap lp-programs-grid">
          <div className="lp-programs-intro">
            {content.eyebrow ? <span className="lp-eyebrow">{content.eyebrow}</span> : null}
            <h2>{content.title}</h2>
            {content.lead ? <p className="lp-lead">{content.lead}</p> : null}
            <SmartLink className="lp-link" href={content.linkHref}>
              {content.linkLabel} <Icon name="arrow" size={16} />
            </SmartLink>
          </div>

          <div className="lp-programs-list">
            {groups.map((group) => (
              <div className="lp-faculty" key={group.label || "program"}>
                <div className="lp-faculty-head">
                  <h3>{group.label || "Program studi"}</h3>
                  <span>{group.items.length} program</span>
                </div>
                <ul>
                  {group.items.map((program) => (
                    <li key={program.title}>
                      <SmartLink
                        aria-label={`Pelajari ${program.title}`}
                        className={`lp-prog lp-c-${program.color}`}
                        href={program.href ?? "#pmb"}
                      >
                        <span aria-hidden="true" className="lp-prog-dot" />
                        <strong className="lp-prog-title">{program.title}</strong>
                        <span className="lp-prog-code">{program.code}</span>
                        <span aria-hidden="true" className="lp-prog-arrow">
                          <Icon name="arrow" size={16} />
                        </span>
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
