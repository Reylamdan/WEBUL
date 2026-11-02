import { Icon } from "@/components/icons";

export function AdmissionBanner() {
  return (
    <section className="admission-banner" id="pmb">
      <div className="admission-inner">
        <div>
          <span className="eyebrow eyebrow-light">PENERIMAAN MAHASISWA BARU</span>
          <h2>When Technology Meets Language Expertise.</h2>
          <p>
            Kenali informasi jalur pendaftaran, beasiswa, dan biaya kuliah
            sebelum memulai proses pendaftaran.
          </p>
        </div>
        <div className="admission-actions">
          <a className="button button-light" href="#footer">
            Daftar Sekarang <Icon name="arrow" size={16} />
          </a>
          <a href="#footer">
            Informasi jalur pendaftaran <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
