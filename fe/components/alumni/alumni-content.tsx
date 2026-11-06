import React from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

interface AlumniSectionProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}

export function AlumniSection({ title, eyebrow, description, children, id }: AlumniSectionProps) {
  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby={id} className="profile-section profile-wrap">
        <div className="profile-section-header">
          {eyebrow && <span className="profile-eyebrow">{eyebrow}</span>}
          <h2 className="profile-section-title" id={id}>
            {title}
          </h2>
          {description && <p className="profile-section-desc">{description}</p>}
        </div>
        <div className="profile-cards-grid">{children}</div>
      </section>
    </ScrollReveal>
  );
}

export interface AlumniCardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function AlumniCard({ title, description, children }: AlumniCardProps) {
  return (
    <article className="profile-card">
      <div className="profile-card-accent" />
      <div className="profile-card-body">
        <h3 className="profile-card-title">{title}</h3>
        <p className="profile-card-desc">{description}</p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </article>
  );
}
