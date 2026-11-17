"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { organizationApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

// Dipakai selama belum ada data "unit" yang dipublikasikan dari admin.
const FALLBACK_UNITS = [{ title: "Pimpinan Universitas" }, { title: "Unit dan Bagian" }, { title: "Organ pendukung" }];

export function UnitPimpinan() {
  const { data } = useApi("organization-unit", () => organizationApi.list({ category: "unit" }));
  const units = data && data.length > 0 ? data : null;

  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="unit-title" className="struktur-section struktur-wrap">
        <div className="struktur-section-header">
          <span className="struktur-eyebrow">INFORMASI ORGANISASI</span>
          <h2 className="struktur-section-title" id="unit-title">
            Unit dan Pimpinan
          </h2>
          <p className="struktur-section-desc">
            {units
              ? "Unit kerja, pimpinan, dan organ pendukung Universitas LIA."
              : "Informasi nama, jabatan, dan unit kerja dapat ditambahkan setelah susunan resmi dikonfirmasi."}
          </p>
        </div>

        <div className="unit-cards-grid">
          {units
            ? units.map((unit) => (
                <article className={`unit-card ${unit.imageUrl ? "has-image" : "no-image"}`} key={unit.id}>
                  {unit.imageUrl ? (
                    <div className="unit-card-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={unit.title} decoding="async" loading="lazy" src={unit.imageUrl} />
                    </div>
                  ) : (
                    <div className="unit-card-accent" />
                  )}
                  <div className="unit-card-body">
                    <h3 className="unit-card-title">{unit.title}</h3>
                    {unit.position && <span className="unit-card-position">{unit.position}</span>}
                    {unit.description && <p className="unit-card-desc">{unit.description}</p>}
                  </div>
                </article>
              ))
            : FALLBACK_UNITS.map((unit) => (
                <article className="unit-card no-image" key={unit.title}>
                  <div className="unit-card-accent" />
                  <div className="unit-card-body">
                    <h3 className="unit-card-title">{unit.title}</h3>
                  </div>
                </article>
              ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
