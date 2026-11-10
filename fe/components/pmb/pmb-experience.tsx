import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function PmbExperience() {
  return (
    <ScrollReveal>
      <section
        aria-labelledby="pmb-experience-title"
        className="pmb-experience pmb-wrap"
      >
        <div aria-hidden="true" className="pmb-experience-art">
          <span className="pmb-experience-orbit" />
          <span className="pmb-experience-mark">LIA</span>
          <span className="pmb-experience-caption">RUANG UNTUK BERTUMBUH</span>
        </div>

        <div className="pmb-experience-copy">
          <span className="pmb-eyebrow">LEBIH DARI SEKADAR KULIAH</span>

          <h2 id="pmb-experience-title">Bekal untuk terus berkembang</h2>

          <p>
            Bangun pengetahuan, temukan minat, dan bertumbuh bersama komunitas kampus yang mendukung perjalanan belajarmu.
          </p>

          <ul>
            <li>Belajar dalam lingkungan akademik yang suportif</li>
            <li>Mengembangkan keterampilan sesuai bidang pilihan</li>
            <li>Mengenal komunitas dan kehidupan kampus</li>
          </ul>

          <Link className="pmb-text-link" href="/#kehidupan">
            Kenali kehidupan kampus <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </ScrollReveal>
  );
}

