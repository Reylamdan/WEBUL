import { Icon } from "@/components/icons";

export function PeriodeHeader() {
  return (
    <header className="pmb-period-hero pmb-wrap">
      <span aria-hidden="true" className="pmb-period-hero-icon">
        <Icon name="calendar" size={24} />
      </span>
      <span className="pmb-eyebrow">PENERIMAAN MAHASISWA BARU</span>
      <h1>Periode Pendaftaran</h1>
      <p>
        Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA.
        Pilih gelombang untuk melihat jadwal pendaftaran, tes, dan daftar ulang.
      </p>
    </header>
  );
}
