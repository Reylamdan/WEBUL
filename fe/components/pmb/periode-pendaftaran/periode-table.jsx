import { Icon } from "@/components/icons";
import { registrationWaves as defaultWaves } from "./periode-data";

export function PeriodeTable({ settings, waves }) {
  const sectionEyebrow = settings?.sectionEyebrow || "JADWAL PENERIMAAN 2027";
  const sectionTitle = settings?.sectionTitle || "Tahapan pendaftaran";
  const sectionDescription =
    settings?.sectionDescription ||
    "Jadwal di bawah merupakan data contoh dan dapat diperbarui.";

  const waveList = Array.isArray(waves) && waves.length > 0 ? waves : defaultWaves;

  return (
    <section aria-label="Jadwal gelombang pendaftaran" className="pmb-period-list">
      <div className="pmb-wrap">
        <div className="pmb-period-heading">
          <div>
            <span className="pmb-eyebrow">{sectionEyebrow}</span>
            <h2>{sectionTitle}</h2>
          </div>
          <p>{sectionDescription}</p>
        </div>

        <div className="pmb-period-grid">
          {waveList.map((wave, index) => (
            <article
              className={`pmb-period-card pmb-period-card-${(index % 3) + 1}`}
              key={wave.id || wave.name || index}
            >
              <div className="pmb-period-card-heading">
                <span className="pmb-period-wave">
                  <Icon name="calendar" size={17} />
                  {wave.name}
                </span>
                {wave.label && <span className="pmb-period-label">{wave.label}</span>}
              </div>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Kegiatan</th>
                    <th scope="col">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {(wave.activities || []).map((activity, activityIndex) => (
                    <tr key={`${activity.name}-${activityIndex}`}>
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
