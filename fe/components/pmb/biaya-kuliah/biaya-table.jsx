import { Icon } from "@/components/icons";
import { studyPrograms, tuitionWaves } from "./biaya-data";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function WaveTable({ wave, index }) {
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
            {studyPrograms.map((program, programIndex) => (
              <tr key={program}>
                <td>{program}</td>
                <td>{currencyFormatter.format(wave.tuition[programIndex])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function BiayaTable() {
  return (
    <section aria-label="UKT berdasarkan gelombang pendaftaran" className="pmb-tuition-list">
      <div className="pmb-wrap">
        <div className="pmb-tuition-heading">
          <div>
            <span className="pmb-eyebrow">RINCIAN BIAYA</span>
            <h2>UKT setiap Gelombang</h2>
          </div>
          
        </div>
        <div className="pmb-tuition-grid">
          {tuitionWaves.map((wave, index) => (
            <WaveTable index={index} key={wave.name} wave={wave} />
          ))}
        </div>
      </div>
    </section>
  );
}
