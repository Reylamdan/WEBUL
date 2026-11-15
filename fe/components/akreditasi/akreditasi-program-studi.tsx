"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { accreditationApi, errorMessage, formatDate } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function AkreditasiProgramStudi() {
  const { data, error, loading } = useApi("akreditasi-prodi-cards", () =>
    accreditationApi.studyPrograms({ page: 1, limit: 50 }),
  );
  const prodiList = data?.items ?? [];

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

        {error && !data ? (
          <p className="akreditasi-note" role="alert">
            {errorMessage(error)}
          </p>
        ) : loading && !data ? (
          <p className="akreditasi-note" aria-live="polite">
            Memuat data akreditasi program studi...
          </p>
        ) : prodiList.length === 0 ? (
          <p className="akreditasi-note">Data akreditasi program studi belum tersedia.</p>
        ) : (
          <div className="akreditasi-prodi-grid">
            {prodiList.map((item) => (
              <article className="akreditasi-card" key={item.id}>
                <div className="akreditasi-card-accent" />
                <div className="akreditasi-card-body">
                  <h3 className="akreditasi-card-title">{item.programName}</h3>
                  <p className="akreditasi-card-desc">
                    {[
                      item.educationLevel,
                      item.rank,
                      item.skNumber ? `SK ${item.skNumber}` : "",
                      item.validUntil ? `Berlaku s.d. ${formatDate(item.validUntil)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="akreditasi-note">
          Informasi final sebaiknya dilengkapi dengan nomor keputusan, lembaga akreditasi, dan periode berlaku.
        </p>
      </section>
    </ScrollReveal>
  );
}
