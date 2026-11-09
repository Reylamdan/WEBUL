import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export function KomputerTugas() {
  const tugasList = [
    {
      number: "01",
      category: "Standar Operasional",
      title: "SOP Pengelolaan UPT Komputer",
      description: "Menyusun SOP pengelolaan UPT Komputer.",
    },
    {
      number: "02",
      category: "Kebijakan Dasar",
      title: "Kebijakan Dasar TI & SIMPT",
      description:
        "Menyusun kebijakan dasar pengembangan dan operasionalisasi Teknologi Informasi dan Sistem Informasi Manajemen Perguruan Tinggi (SIMPT) di Universitas LIA.",
    },
    {
      number: "03",
      category: "Perencanaan Strategis",
      title: "Penyusunan Blueprint TIK",
      description:
        "Menyusun blueprint pengembangan dan operasionalisasi Teknologi Informasi dan SIMPT di Universitas LIA.",
    },
    {
      number: "04",
      category: "Infrastruktur & Data",
      title: "Program, Jaringan & Database Terpadu",
      description:
        "Mengembangkan program, sistem jaringan dan sistem database yang mampu mengakomodasi seluruh fungsi administrasi dan pembelajaran, penelitian dan pengabdian masyarakat secara bertahap.",
    },
    {
      number: "05",
      category: "Aplikasi Web",
      title: "Pengembangan Situs Web Interaktif",
      description: "Merencanakan pengembangan aplikasi pada situs web yang interaktif.",
    },
    {
      number: "06",
      category: "Standarisasi TI",
      title: "Standar Perangkat Keras, Jaringan & Lunak",
      description:
        "Mengembangkan standar perangkat keras, jaringan dan perangkat lunak yang dipergunakan dalam kegiatan administrasi, manajemen dan proses belajar mengajar di Universitas LIA.",
    },
    {
      number: "07",
      category: "Keamanan Siber",
      title: "Sistem Keamanan Terpadu Infrastruktur TI",
      description:
        "Membangun dan mengembangkan sistem keamanan terpadu infrastruktur TI baik untuk internal maupun keluar Universitas LIA.",
    },
  ];

  return (
    <ScrollReveal delay={140}>
      <section aria-labelledby="upt-komputer-tugas-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TUGAS &amp; FUNGSI</span>
          <h2 className="upt-section-title" id="upt-komputer-tugas-title">
            Tugas dan Tanggung Jawab
          </h2>
          <p className="upt-section-desc">
            Unit Pelaksana Teknis Komputer memiliki tugas dan tanggung jawab seperti berikut:
          </p>
        </div>

        <div className="upt-tugas-cards">
          {tugasList.map((item) => (
            <article className="upt-tugas-card" key={item.number}>
              <div className="upt-tugas-header">
                <span className="upt-tugas-number">{item.number}</span>
                <span className="upt-tugas-category">{item.category}</span>
              </div>
              <h3 className="upt-tugas-card-title">{item.title}</h3>
              <p className="upt-tugas-card-desc">{item.description}</p>
              {item.number === "03" && (
                <div style={{ marginTop: "12px" }}>
                  <Link
                    className="upt-link-badge"
                    href="/profil/unit-dan-bagian/blueprint-tik"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--blue, #005b8c)",
                    }}
                  >
                    Buka Dokumen Blueprint TIK ↗
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

