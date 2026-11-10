import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Cara Pembayaran — Universitas LIA",
  description:
    "Panduan mendapatkan kode Virtual Account dan melakukan pembayaran tagihan mahasiswa Universitas LIA.",
};

const virtualAccountSteps = [
  {
    title: "Login SiAkad",
    description: "Login pada sistem informasi akademik kampus.",
  },
  {
    title: "Pilih menu Riwayat Keuangan",
    description: "Klik profil, lalu pilih Riwayat Keuangan.",
  },
  {
    title: "Pilih tagihan",
    description: "Centang pada tagihan yang ingin dibayar.",
  },
  {
    title: "Klik Generated Virtual Account",
    description: "Klik tombol Generated Virtual Account.",
  },
  {
    title: "Berhasil mendapat Virtual Account",
    description:
      "Simpan kode VA yang didapatkan dan bayarkan sebelum jatuh tempo (expired kode pembayaran).",
  },
];

export default function CaraPembayaranPage() {
  return (
    <main className="pmb-payment-page">
      <header className="pmb-payment-hero pmb-wrap">
        <nav aria-label="Breadcrumb" className="pmb-breadcrumb">
          <Link href="/pmb">PMB</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Cara Pembayaran</span>
        </nav>
        <span aria-hidden="true" className="pmb-payment-hero-icon">
          <Icon name="monitor" size={24} />
        </span>
        <span className="pmb-eyebrow">INFORMASI PEMBAYARAN</span>
        <h1>Cara Pembayaran</h1>
        <p>
          Ikuti panduan berikut untuk membuat kode Virtual Account dari SiAkad
          dan membayar tagihan kuliah melalui berbagai kanal pembayaran.
        </p>
      </header>

      <section
        aria-labelledby="pmb-payment-va-title"
        className="pmb-payment-section pmb-payment-va"
      >
        <div className="pmb-wrap">
          <div className="pmb-payment-heading">
            <span className="pmb-eyebrow">PANDUAN SIAKAD</span>
            <h2 id="pmb-payment-va-title">
              Generated kode bayar atau Virtual Account (VA)
            </h2>
            <p>
              Buat kode pembayaran melalui menu Riwayat Keuangan di sistem
              informasi akademik.
            </p>
          </div>

          <ol className="pmb-payment-steps">
            {virtualAccountSteps.map((step, index) => (
              <li className="pmb-payment-step" key={step.title}>
                <span aria-hidden="true" className="pmb-payment-step-number">
                  {index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="pmb-payment-image-grid">
            <figure className="pmb-payment-image-card">
              <Image
                alt="Menu profil SiAkad dengan pilihan Tagihan Mahasiswa"
                height={872}
                src="/Screenshot%20from%202026-11-10%2009-21-35.png"
                width={1374}
              />
              <figcaption>
                Buka menu profil, lalu pilih <strong>Tagihan Mahasiswa</strong>{" "}
                untuk melihat tagihan.
              </figcaption>
            </figure>
            <figure className="pmb-payment-image-card">
              <Image
                alt="Halaman Riwayat Keuangan dengan metode pembayaran Mandiri dan tombol Bayar Tagihan"
                height={852}
                src="/Screenshot%20from%202026-11-10%2009-21-49.png"
                width={1379}
              />
              <figcaption>
                Pada halaman keuangan, pilih metode pembayaran dan klik{" "}
                <strong>Bayar Tagihan</strong>.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="pmb-payment-method-title"
        className="pmb-payment-section pmb-payment-methods"
      >
        <div className="pmb-wrap">
          <div className="pmb-payment-heading">
            <span className="pmb-eyebrow">PILIH KANAL PEMBAYARAN</span>
            <h2 id="pmb-payment-method-title">Panduan pembayaran</h2>
            <p>
              Gunakan kode bayar atau nomor Virtual Account yang sudah
              diterbitkan melalui SiAkad.
            </p>
          </div>

          <div className="pmb-payment-method-grid">
            <article className="pmb-payment-method" id="atm-mandiri">
              <span className="pmb-payment-method-number">01</span>
              <h3>Pembayaran melalui ATM Mandiri</h3>
              <ol>
                <li>Masukkan kartu ATM dan PIN.</li>
                <li>
                  Pilih menu <strong>BAYAR/BELI</strong>, lalu pilih menu{" "}
                  <strong>LAINNYA → Multipayment</strong>.
                </li>
                <li>
                  Masukkan kode perusahaan/institusi, yaitu{" "}
                  <strong>89631</strong> atau <strong>EDUFIN</strong> dari Kode
                  Virtual Account (VA) pada Sistem Informasi Akademik (SIAKAD).
                  Contoh: <strong>8963157000001</strong>.
                </li>
                <li>
                  Konfirmasi: tekan <strong>1</strong>, kemudian tekan{" "}
                  <strong>OK</strong>.
                </li>
                <li>Transaksi selesai.</li>
                <li>Simpan struk pembayaran.</li>
              </ol>
            </article>

            <article className="pmb-payment-method" id="livin-mandiri">
              <span className="pmb-payment-method-number">02</span>
              <h3>Pembayaran melalui Livin’ by Mandiri</h3>
              <ol>
                <li>Login pada aplikasi Livin’ by Mandiri.</li>
                <li>
                  Pilih menu <strong>BAYAR/VA</strong>.
                </li>
                <li>
                  Pilih menu <strong>PENDIDIKAN</strong>.
                </li>
                <li>
                  Ketik nama biller <strong>“EDUFIN”</strong> atau ketik kode
                  biller <strong>“89631”</strong>.
                </li>
                <li>
                  Input KODE BAYAR atau Nomor VA yang didapatkan dari Sistem
                  Informasi Akademik. Contoh: <strong>8963157000001</strong>,
                  lalu klik lanjutkan.
                </li>
                <li>
                  Periksa kembali detail transaksi. Jika sudah benar, klik{" "}
                  <strong>Lanjut Bayar</strong>.
                </li>
                <li>
                  Pembayaran selesai. Struk bukti bayar dapat di-share dan
                  di-download sebagai bukti pembayaran.
                </li>
              </ol>
            </article>

            <article className="pmb-payment-method" id="cabang-mandiri">
              <span className="pmb-payment-method-number">03</span>
              <h3>Pembayaran melalui Cabang Mandiri</h3>
              <ol>
                <li>
                  Ambil aplikasi setoran/transfer/kliring/inkaso dan isikan
                  tanggal sesuai dengan tanggal pada saat melakukan transaksi.
                </li>
                <li>
                  Beri tanda pada kolom:
                  <ol type="a">
                    <li>
                      <strong>Setoran ke Rekening Sendiri</strong> jika sumber
                      dana tunai.
                    </li>
                    <li>
                      <strong>Transfer</strong> jika sumber dana dari rekening.
                    </li>
                  </ol>
                </li>
                <li>
                  Beri tanda pada kolom “Penduduk” jika penerima dan pengirim
                  adalah penduduk Indonesia.
                </li>
                <li>Isi nama pengirim sesuai dengan nama penyetor.</li>
                <li>
                  Isi nama penerima dengan <strong>89631</strong> atau{" "}
                  <strong>EduFin</strong>.
                </li>
                <li>
                  Isi nama Bank dengan <strong>BANK MANDIRI</strong>.
                </li>
                <li>
                  Pada nomor rekening, isi dengan Kode Virtual Account (VA) dari
                  Sistem Informasi Akademik (SIAKAD). Contoh:{" "}
                  <strong>8963157000001</strong>.
                </li>
                <li>
                  Beri tanda pada sumber dana transaksi (tunai/debet rekening).
                </li>
              </ol>
            </article>

            <article className="pmb-payment-method" id="mobile-banking-bank-lain">
              <span className="pmb-payment-method-number">04</span>
              <h3>Pembayaran melalui Mobile Banking bank lain</h3>
              <ol>
                <li>Login aplikasi mobile banking.</li>
                <li>
                  Pilih menu <strong>TRANSFER KE BANK LAIN / ANTAR BANK</strong>{" "}
                  (ONLINE).
                </li>
                <li>
                  Pilih bank tujuan <strong>MANDIRI</strong>.
                </li>
                <li>
                  Input KODE BAYAR/VA pada rekening tujuan. Contoh:{" "}
                  <strong>8963100000001</strong>.
                </li>
                <li>
                  Input NOMINAL PEMBAYARAN sesuai dengan tagihan pada Sistem
                  Informasi Akademik (SIAKAD).
                </li>
                <li>Pilih layanan atau metode transfer ONLINE.</li>
                <li>Klik LANJUTKAN.</li>
                <li>
                  Apabila transaksi telah berhasil, STRUK bukti bayar akan
                  muncul. Simpan sebagai bukti pembayaran.
                </li>
              </ol>
              <p className="pmb-payment-note">
                <strong>Catatan:</strong> Pastikan memilih metode/layanan
                transfer dengan jenis ONLINE (BUKAN RTGS dan BUKAN BI FAST).
              </p>
              <aside className="pmb-payment-technical-note">
                <h4>Ketentuan nominal pembayaran</h4>
                <p>
                  Saat menginput nominal tagihan pada Mobile Banking bank lain,
                  pastikan nominal yang diinput hanya nominal tagihan saja.
                  Abaikan biaya administrasi sebesar Rp4.000.
                </p>
              </aside>
            </article>

            <article className="pmb-payment-method" id="atm-bank-lain">
              <span className="pmb-payment-method-number">05</span>
              <h3>Pembayaran melalui ATM bank lain</h3>
              <ol>
                <li>
                  Pilih menu <strong>TRANSFER BANK LAIN</strong> atau{" "}
                  <strong>TRANSFER ONLINE ANTAR BANK</strong>.
                </li>
                <li>
                  Masukkan kode bank <strong>MANDIRI (008)</strong> atau pilih
                  bank yang dituju, yaitu MANDIRI.
                </li>
                <li>
                  Masukkan KODE BAYAR (Nomor Virtual Account) pada kolom
                  rekening tujuan. Contoh: <strong>8963100000001</strong>.
                </li>
                <li>
                  Masukkan NOMINAL transfer sesuai tagihan yang tampil pada
                  Sistem Informasi Akademik (SIAKAD).
                </li>
                <li>
                  Konfirmasi pembayaran akan tampil pada layar. Apabila sudah
                  sesuai, silakan lanjutkan hingga selesai.
                </li>
                <li>
                  Transaksi sukses dan STRUK bukti bayar akan muncul. Simpan
                  sebagai bukti pembayaran.
                </li>
              </ol>
            </article>
          </div>

          <Link className="pmb-payment-back-link" href="/pmb">
            <span aria-hidden="true">←</span> Kembali ke informasi PMB
          </Link>
        </div>
      </section>
    </main>
  );
}
