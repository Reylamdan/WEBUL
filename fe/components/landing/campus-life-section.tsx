import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";

export function CampusLifeSection() {
  return (
    <ScrollReveal delay={210}>
    <section className="campus-life-section content-wrap" id="kehidupan">
      <div className="campus-life-image">
        <span className="life-art-person life-person-one" />
        <span className="life-art-person life-person-two" />
        <span className="life-art-table" />
        <span className="life-photo-label">HARI-HARI DI KAMPUS</span>
      </div>
      <div className="campus-life-copy">
        <span className="eyebrow">LEBIH DARI RUANG KELAS</span>
        <h2>Jalani pengalaman kampus yang penuh cerita</h2>
        <p>
          Temukan teman, kembangkan minat, dan ciptakan pengalaman berharga
          bersama komunitas Universitas LIA.
        </p>
        <a className="text-link" href="#footer">
          Jelajahi kehidupan kampus <Icon name="arrow" size={16} />
        </a>
      </div>
    </section>
    </ScrollReveal>
  );
}
