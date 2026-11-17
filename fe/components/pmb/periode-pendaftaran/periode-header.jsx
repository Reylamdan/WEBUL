import { Icon } from "@/components/icons";

export function PeriodeHeader({ settings }) {
  const eyebrow = settings?.heroEyebrow || "PENERIMAAN MAHASISWA BARU";
  const title = settings?.heroTitle || "Periode Pendaftaran";
  const description =
    settings?.heroDescription ||
    "Informasi tahapan dan jadwal penerimaan mahasiswa baru Universitas LIA. Pilih gelombang untuk melihat jadwal pendaftaran, tes, dan daftar ulang.";

  return (
    <header className="pmb-period-hero pmb-wrap">
      <span aria-hidden="true" className="pmb-period-hero-icon">
        <Icon name="calendar" size={24} />
      </span>
      <span className="pmb-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
