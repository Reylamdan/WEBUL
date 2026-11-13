import { Icon } from "@/components/icons";

const requirements = [
  "Paspor",
  "Surat Pernyataan tidak akan bekerja selama belajar di Indonesia, tidak berpartisipasi di dalam aktivitas politik dan mematuhi peraturan perundang-undangan yang ada di Indonesia (bermeterai)",
  "Ijazah yang telah disetarakan, transkrip akademik, dan rapor terakhir",
  "Surat Keterangan Jaminan Pembiayaan",
  "Surat Keterangan Sehat",
  "Foto berwarna ukuran paspor",
  "Paspor orang tua atau penjamin",
  "Keterangan Izin Tinggal Terbatas / KITAS (khusus izin perpanjangan)",
  "Surat keterangan diterima di Universitas LIA (Letter of Acceptance)",
];

export function MahasiswaAsingContent() {
  return (
    <div className="mahasiswa-asing-content">
      <section
        aria-labelledby="mahasiswa-asing-intro-title"
        className="mahasiswa-asing-intro"
      >
        <span aria-hidden="true" className="mahasiswa-asing-intro-icon">
          <Icon name="globe" size={24} />
        </span>
        <div>
          <span className="mahasiswa-asing-eyebrow">PENERIMAAN MAHASISWA</span>
          <h2 id="mahasiswa-asing-intro-title">Selamat datang di Universitas LIA</h2>
          <p>
            Mahasiswa asing adalah warga negara asing yang akan mengikuti
            pendidikan pada Universitas LIA.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="mahasiswa-asing-requirements-title"
        className="mahasiswa-asing-requirements"
      >
        <div className="mahasiswa-asing-section-heading">
          <span className="mahasiswa-asing-eyebrow">PERSIAPAN DOKUMEN</span>
          <h2 id="mahasiswa-asing-requirements-title">Syarat dan Ketentuan</h2>
          <p>
            Untuk dapat mengikuti kegiatan pembelajaran, mahasiswa asing wajib
            memenuhi dokumen persyaratan yang digunakan untuk mengurus izin
            belajar dibawah ini:
          </p>
        </div>

        <ol className="mahasiswa-asing-list">
          {requirements.map((requirement, index) => (
            <li className="mahasiswa-asing-list-item" key={requirement}>
              <span aria-hidden="true" className="mahasiswa-asing-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{requirement}</span>
            </li>
          ))}
        </ol>
      </section>

      <aside
        aria-labelledby="mahasiswa-asing-reference-title"
        className="mahasiswa-asing-reference"
      >
        <span aria-hidden="true" className="mahasiswa-asing-reference-icon">
          <Icon name="file" size={21} />
        </span>
        <div>
          <h2 id="mahasiswa-asing-reference-title">Referensi Dokumen</h2>
          <p>Contoh dokumen persyaratan dapat dilihat melalui link:</p>
        </div>
        <a
          href="https://izinbelajar.kemdiktisaintek.go.id"
          rel="noopener noreferrer"
          target="_blank"
        >
          izinbelajar.kemdiktisaintek.go.id
          <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </div>
  );
}
