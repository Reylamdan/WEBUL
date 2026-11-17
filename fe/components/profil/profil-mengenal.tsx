"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { profileApi } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function ProfilMengenal() {
  const { data } = useApi("public-profile", () => profileApi.get());
  const content = data?.content;

  const eyebrow = content?.aboutEyebrow || "TENTANG KAMI";
  const title = content?.aboutTitle || "Mengenal Universitas LIA";
  const lead =
    content?.aboutLead ||
    "Informasi ringkas mengenai identitas, perjalanan, dan komitmen Universitas LIA.";
  const body =
    content?.aboutBody ||
    "Universitas LIA berkomitmen menghadirkan pengalaman pendidikan yang relevan, kolaboratif, dan berorientasi pada pengembangan kompetensi. Bagian ini dapat dilengkapi dengan profil resmi, nilai institusi, serta informasi utama universitas.";
  const imageUrl = content?.aboutImageUrl;

  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="mengenal-title" className="profile-section profile-wrap">
        <div className="profile-mengenal-grid">
          <div className="profile-mengenal-copy">
            <span className="profile-eyebrow">{eyebrow}</span>
            <h2 className="profile-section-title" id="mengenal-title">
              {title}
            </h2>
            <p className="profile-lead">{lead}</p>
            <p className="profile-body-text">{body}</p>
          </div>

          <div className="profile-mengenal-visual">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={title}
                className="profile-media-image"
                decoding="async"
                loading="lazy"
                src={imageUrl}
              />
            ) : (
              <div aria-hidden="true" className="profile-placeholder-box" />
            )}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
