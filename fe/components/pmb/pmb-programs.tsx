import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

const programs = [
  {
    name: "S1 Desain Komunikasi Visual",
    group: "Humaniora & Desain",
    level: "Sarjana",
  },
  {
    name: "S1 Bahasa Inggris",
    group: "Humaniora & Desain",
    level: "Sarjana",
  },
  {
    name: "S1 Bahasa Jepang",
    group: "Humaniora & Desain",
    level: "Sarjana",
  },
  {
    name: "D3 Bahasa Inggris",
    group: "Humaniora & Desain",
    level: "Diploma",
  },
  {
    name: "S1 Bisnis Digital",
    group: "Sains & Bisnis",
    level: "Sarjana",
  },
  {
    name: "S1 Sistem Informasi",
    group: "Sains & Bisnis",
    level: "Sarjana",
  },
  {
    name: "S1 Informatika",
    group: "Sains & Bisnis",
    level: "Sarjana",
  },
];

export function PmbPrograms() {
  return (
    <ScrollReveal delay={70}>
      <section
        aria-labelledby="pmb-program-title"
        className="pmb-section pmb-wrap"
        id="program-pilihan"
      >
        <div className="pmb-section-heading">
          <span className="pmb-eyebrow">PILIHAN STUDI</span>

          <h2 id="pmb-program-title">Temukan program studi pilihanmu</h2>

          <p>
            Jelajahi bidang humaniora, desain, sains, dan bisnis yang tersedia di Universitas LIA.
          </p>
        </div>

        <div className="pmb-program-grid">
          {programs.map((program, index) => (
            <Link
              className="pmb-program-card"
              href="/akademik/fakultas#program-list"
              key={program.name}
            >
              <span className="pmb-program-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="pmb-program-group">{program.group}</span>

              <strong>{program.name}</strong>

              <span className="pmb-program-level">{program.level}</span>

              <span aria-hidden="true" className="pmb-program-arrow">
                ↗
              </span>
            </Link>
          ))}
        </div>

        <Link
          className="pmb-text-link pmb-all-programs"
          href="/akademik/fakultas"
        >
          Lihat informasi fakultas <span aria-hidden="true">→</span>
        </Link>
      </section>
    </ScrollReveal>
  );
}

