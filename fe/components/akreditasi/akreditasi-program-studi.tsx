import { ScrollReveal } from "@/components/scroll-reveal";

export function AkreditasiProgramStudi() {
  const prodiList = [
    {
      title: "Program Studi 1",
      description: "Status dan dokumen akreditasi akan ditambahkan.",
    },
    {
      title: "Program Studi 2",
      description: "Status dan dokumen akreditasi akan ditambahkan.",
    },
    {
      title: "Program Studi 3",
      description: "Status dan dokumen akreditasi akan ditambahkan.",
    },
  ];

  return (
    <ScrollReveal delay={200}>
      <section aria-labelledby="prodi-title" className="akreditasi-section akreditasi-wrap">
        <div className="akreditasi-section-header">
          <span className="akreditasi-eyebrow">PROGRAM STUDI</span>
          <h2 className="akreditasi-section-title" id="prodi-title">
            Akreditasi Program Studi
          </h2>
          <p className="akreditasi-section-desc">
            Informasi akreditasi masing-masing program studi akan ditambahkan setelah data terverifikasi.
          </p>
        </div>

        <div className="akreditasi-prodi-grid">
          {prodiList.map((item) => (
            <article className="akreditasi-card" key={item.title}>
              <div className="akreditasi-card-accent" />
              <div className="akreditasi-card-body">
                <h3 className="akreditasi-card-title">{item.title}</h3>
                <p className="akreditasi-card-desc">{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="akreditasi-note">
          Informasi final sebaiknya dilengkapi dengan nomor keputusan, lembaga akreditasi, dan periode berlaku.
        </p>
      </section>
    </ScrollReveal>
  );
}

