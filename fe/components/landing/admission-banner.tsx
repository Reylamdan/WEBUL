import { Icon } from "@/components/icons";
import Link from "next/link";

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
          <Link className="button button-light" href="/pmb">
            Daftar Sekarang <Icon name="arrow" size={16} />
          </Link>
          <Link href="/pmb#jalur-pendaftaran">
            Informasi jalur pendaftaran <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
