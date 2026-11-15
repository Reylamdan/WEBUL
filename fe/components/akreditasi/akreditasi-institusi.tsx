"use client";

import { DocumentLink } from "@/components/document-link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { accreditationApi, errorMessage, formatDate } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function AkreditasiInstitusi() {
  // Backend mengurutkan dari masa berlaku terbaru, jadi data pertama adalah akreditasi institusi yang berlaku.
  const { data, error, loading } = useApi("akreditasi-institusi", () =>
    accreditationApi.institutions({ page: 1, limit: 1 }),
  );
  const institution = data?.items[0];

  return (
    <ScrollReveal delay={100}>
      <section aria-labelledby="institusi-title" className="akreditasi-section akreditasi-wrap">
        <div className="akreditasi-institusi-grid">
          <div className="akreditasi-institusi-copy">
            <span className="akreditasi-eyebrow">AKREDITASI INSTITUSI</span>
            <h2 className="akreditasi-section-title" id="institusi-title">
              Peringkat Akreditasi Universitas
            </h2>
            <p className="akreditasi-lead">
              Universitas LIA berkomitmen menjaga standar mutu pendidikan tinggi.
            </p>
            <p className="akreditasi-body-text">
              Status akreditasi institusi merupakan bukti komitmen kami dalam menyelenggarakan tata kelola dan layanan akademik yang berkualitas sesuai dengan standar nasional.
            </p>
          </div>

          <div className="akreditasi-institusi-visual">
            {institution ? (
              <div className="akreditasi-institusi-card">
                <span className="akreditasi-eyebrow">{institution.institutionName}</span>
                <span className="akreditasi-institusi-rank">{institution.rank}</span>
                <p>SK {institution.skNumber}</p>
                {institution.issuingBody && <p>{institution.issuingBody}</p>}
                {institution.validUntil && <p>Berlaku s.d. {formatDate(institution.validUntil)}</p>}
                <DocumentLink emptyLabel="" file={institution.document} viewLabel="Lihat SK" downloadLabel="Unduh SK" />
              </div>
            ) : error ? (
              <div className="akreditasi-institusi-card" role="alert">
                <p>{errorMessage(error)}</p>
              </div>
            ) : loading ? (
              <div aria-live="polite" className="akreditasi-institusi-card">
                <p>Memuat data akreditasi institusi...</p>
              </div>
            ) : (
              <div className="akreditasi-institusi-card">
                <p>Data akreditasi institusi belum tersedia.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
