import React from "react";

export interface VisiCardProps {
  title: string;
  description: string;
  className?: string;
}

export function VisiCard({ title, description, className = "" }: VisiCardProps) {
  return (
    <article className={`visi-card ${className}`}>
      <div className="visi-card-accent" />
      <div className="visi-card-body">
        <h3 className="visi-card-title">{title}</h3>
        <p className="visi-card-desc">{description}</p>
      </div>
    </article>
  );
}
