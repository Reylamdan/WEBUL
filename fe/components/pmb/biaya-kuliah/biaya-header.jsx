import { Icon } from "@/components/icons";

export function BiayaHeader({ settings }) {
  const eyebrow = settings?.heroEyebrow || "PENERIMAAN MAHASISWA BARU";
  const title = settings?.heroTitle || "Biaya Kuliah";
  const description =
    settings?.heroDescription ||
    "Temukan informasi biaya kuliah Universitas LIA berdasarkan program studi dan gelombang pendaftaran. Pilih gelombang untuk melihat rincian biaya pendidikan.";

  return (
    <header className="pmb-tuition-hero pmb-wrap">
      <span aria-hidden="true" className="pmb-tuition-hero-icon">
        <Icon name="file" size={24} />
      </span>
      <span className="pmb-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
