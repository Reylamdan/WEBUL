"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { organizationApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function BaganOrganisasi() {
  const { data } = useApi("organization-bagan", () => organizationApi.list({ category: "bagan" }));
  const items = data ?? [];

  return (
    <ScrollReveal delay={200}>
      <section aria-labelledby="bagan-title" className="struktur-section struktur-wrap">
        <div className="struktur-section-header">
          <span className="struktur-eyebrow">TATA KELOLA</span>
          <h2 className="struktur-section-title" id="bagan-title">
            Bagan Organisasi
          </h2>
          <p className="struktur-section-desc">
            {items.length > 0
              ? "Susunan organisasi dan tata kelola Universitas LIA."
              : "Bagan struktur organisasi akan ditempatkan di area berikut setelah data resmi tersedia."}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bagan-large-box">
            <span className="bagan-placeholder-text">Bagan struktur organisasi — isi nanti</span>
          </div>
        ) : (
          items.map((item) => (
            <figure className="bagan-item" key={item.id}>
              {item.imageUrl && (
                <div className="bagan-item-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={item.title} decoding="async" loading="lazy" src={item.imageUrl} />
                </div>
              )}
              {(item.title || item.description) && (
                <figcaption className="bagan-item-caption">
                  <strong>{item.title}</strong>
                  {item.description && <p>{item.description}</p>}
                </figcaption>
              )}
            </figure>
          ))
        )}
      </section>
    </ScrollReveal>
  );
}
