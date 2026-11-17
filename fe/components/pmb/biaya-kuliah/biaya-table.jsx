import { Icon } from "@/components/icons";
import { studyPrograms as defaultStudyPrograms, tuitionWaves as defaultTuitionWaves } from "./biaya-data";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function WaveTable({ wave, index }) {
  const hasCustomFees = Array.isArray(wave.fees) && wave.fees.length > 0;

  return (
    <article className={`pmb-tuition-card pmb-tuition-card-${index + 1}`}>
      <header className="pmb-tuition-card-heading">
        <span className="pmb-tuition-wave">
          <Icon name="calendar" size={18} />
          {wave.name}
        </span>
        <p>
          Periode: <strong>{wave.period}</strong>
        </p>
      </header>
      <div className="pmb-tuition-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Program Studi</th>
              <th scope="col">UKT</th>
            </tr>
          </thead>
          <tbody>
            {hasCustomFees
              ? wave.fees.map((fee, feeIdx) => (
                  <tr key={fee.program || feeIdx}>
                    <td>{fee.program}</td>
                    <td>{currencyFormatter.format(fee.amount || 0)}</td>
                  </tr>
                ))
              : defaultStudyPrograms.map((program, programIndex) => (
                  <tr key={program}>
                    <td>{program}</td>
                    <td>
                      {currencyFormatter.format(
                        Array.isArray(wave.tuition) ? wave.tuition[programIndex] || 0 : 0
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function BiayaTable({ settings, waves }) {
  const displayWaves = Array.isArray(waves) && waves.length > 0 ? waves : defaultTuitionWaves;
  const sectionEyebrow = settings?.sectionEyebrow || "RINCIAN BIAYA";
  const sectionTitle = settings?.sectionTitle || "UKT setiap Gelombang";

  return (
    <section aria-label="UKT berdasarkan gelombang pendaftaran" className="pmb-tuition-list">
      <div className="pmb-wrap">
        <div className="pmb-tuition-heading">
          <div>
            <span className="pmb-eyebrow">{sectionEyebrow}</span>
            <h2>{sectionTitle}</h2>
          </div>
        </div>
        <div className="pmb-tuition-grid">
          {displayWaves.map((wave, index) => (
            <WaveTable index={index} key={wave.id || wave.name || index} wave={wave} />
          ))}
        </div>
      </div>
    </section>
  );
}
