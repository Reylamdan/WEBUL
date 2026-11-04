import React from "react";
import Link from "next/link";

export interface ProfilCardProps {
  title: string;
  description: string;
  href?: string;
  className?: string;
}

export function ProfilCard({
  title,
  description,
  href,
  className = "",
}: ProfilCardProps) {
  const content = (
    <article className={`profile-card ${className}`}>
      <div className="profile-card-accent" />
      <div className="profile-card-body">
        <h3 className="profile-card-title">{title}</h3>
        <p className="profile-card-desc">{description}</p>
      </div>
    </article>
  );

  if (href) {
    return (
      <Link className="profile-card-link" href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

