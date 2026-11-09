import { Icon } from "@/components/icons";
import { registrationWaves } from "./periode-data";

export function PeriodeTable() {
  return (
    <section aria-label="Jadwal gelombang pendaftaran" className="pmb-period-list">
      <div className="pmb-wrap">
        <div className="pmb-period-heading">
          <div>
            <span className="pmb-eyebrow">JADWAL PENERIMAAN 2027</span>
            <h2>Tahapan pendaftaran</h2>
          </div>
          <p>Jadwal di bawah merupakan data contoh dan dapat diperbarui.</p>
        </div>

        <div className="pmb-period-grid">
          {registrationWaves.map((wave, index) => (
            <article
              className={`pmb-period-card pmb-period-card-${index + 1}`}
              key={wave.name}
            >
              <div className="pmb-period-card-heading">
                <span className="pmb-period-wave">
                  <Icon name="calendar" size={17} />
                  {wave.name}
                </span>
                <span className="pmb-period-label">{wave.label}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Kegiatan</th>
                    <th scope="col">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {wave.activities.map((activity, activityIndex) => (
                    <tr key={activity.name}>
                      <td>
                        <span className="pmb-period-step">
                          {String(activityIndex + 1).padStart(2, "0")}
                        </span>
                        {activity.name}
                      </td>
                      <td>{activity.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
