import { Icon } from "@/components/icons";

export function BiayaHeader() {
  return (
    <header className="pmb-tuition-hero pmb-wrap">
      <span aria-hidden="true" className="pmb-tuition-hero-icon">
        <Icon name="file" size={24} />
      </span>
      <span className="pmb-eyebrow">PENERIMAAN MAHASISWA BARU</span>
      <h1>Biaya Kuliah</h1>
      <p>
        Temukan informasi biaya kuliah Universitas LIA berdasarkan program
        studi dan gelombang pendaftaran. Pilih gelombang untuk melihat rincian
        biaya pendidikan.
      </p>
    </header>
  );
}
