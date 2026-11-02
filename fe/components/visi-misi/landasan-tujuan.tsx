import { VisiCard } from "./visi-card";
import { ScrollReveal } from "@/components/scroll-reveal";

export function LandasanTujuan() {
  const items = [
    {
      title: "Visi",
      description:
        "Menjadi arah bersama dalam membangun pendidikan yang relevan, terbuka, dan berorientasi pada masa depan.",
    },
    {
      title: "Misi",
      description:
        "Menghadirkan pengalaman belajar yang mendorong penguasaan ilmu, kreativitas, dan kesiapan berkarya.",
    },
  ];

  return (
    <ScrollReveal delay={70}>
    <section aria-labelledby="landasan-title" className="visi-section visi-wrap">
      <div className="visi-section-header">
        <span className="visi-eyebrow">ARAH INSTITUSI</span>
        <h2 className="visi-section-title" id="landasan-title">
          Landasan dan Tujuan
        </h2>
        <p className="visi-section-desc">
          Nilai pendidikan, pengembangan potensi, dan kesiapan menghadapi perubahan menjadi landasan perjalanan akademik.
        </p>
      </div>

      <div className="visi-grid-2">
        {items.map((item) => (
          <VisiCard
            description={item.description}
            key={item.title}
            title={item.title}
          />
        ))}
      </div>
    </section>
    </ScrollReveal>
  );
}
