import { Icon } from "@/components/icons";
import { SectionHeading } from "./section-heading";

export function UpdatesSection() {
  return (
    <section className="updates-section content-wrap">
      <div className="update-column">
        <SectionHeading link="Lihat semua" title="Pengumuman" />
        <a className="update-item" href="#kabar">
          <span className="update-date">
            <strong>18</strong>
            <small>JUN</small>
          </span>
          <span className="update-copy">
            <small>AKADEMIK</small>
            <strong>Jadwal registrasi semester ganjil 2025/2026</strong>
          </span>
          <Icon name="arrow" size={17} />
        </a>
        <a className="update-item" href="#kabar">
          <span className="update-date">
            <strong>12</strong>
            <small>JUN</small>
          </span>
          <span className="update-copy">
            <small>KEMAHASISWAAN</small>
            <strong>Pendaftaran kegiatan orientasi mahasiswa baru</strong>
          </span>
          <Icon name="arrow" size={17} />
        </a>
      </div>
      <div className="update-column">
        <SectionHeading link="Lihat semua" title="Agenda kampus" />
        <a className="update-item" href="#kehidupan">
          <span className="update-date">
            <strong>24</strong>
            <small>JUN</small>
          </span>
          <span className="update-copy">
            <small>ACARA KAMPUS</small>
            <strong>Open House Universitas LIA — Kenali kampusmu</strong>
          </span>
          <Icon name="arrow" size={17} />
        </a>
        <a className="update-item" href="#kehidupan">
          <span className="update-date">
            <strong>02</strong>
            <small>JUL</small>
          </span>
          <span className="update-copy">
            <small>WORKSHOP</small>
            <strong>Creative talk: ide sederhana, dampak luar biasa</strong>
          </span>
          <Icon name="arrow" size={17} />
        </a>
      </div>
    </section>
  );
}
