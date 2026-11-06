import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

interface AlumniHeroProps {
  title: string;
  subtitle: string;
  breadcrumb: { label: string; href?: string }[];
}

export function AlumniHero({ title, subtitle, breadcrumb }: AlumniHeroProps) {
  return (
    <ScrollReveal>
      <section aria-labelledby="alumni-hero-title" className="profile-hero profile-wrap">
        <div className="profile-hero-left">
          <nav aria-label="Breadcrumb" className="profile-breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={index}>
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
                {index < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
              </span>
            ))}
          </nav>

          <h1 className="profile-hero-title" id="alumni-hero-title">
            <span className="profile-title-underline">{title.split(" ")[0]}</span> {title.split(" ").slice(1).join(" ")}
          </h1>

          <p className="profile-hero-subtitle">{subtitle}</p>
        </div>

        <div className="profile-hero-right">
          <div aria-hidden="true" className="profile-placeholder-box" />
        </div>
      </section>
    </ScrollReveal>
  );
}
