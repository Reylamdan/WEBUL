"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useApi } from "@/lib/use-api";
import { paymentGuideApi, type PaymentChannelItem, type PaymentVaStepItem } from "@/lib/api";

const DEFAULT_VA_STEPS: PaymentVaStepItem[] = [
  {
    id: "default-va-1",
    title: "Login SiAkad",
    description: "Login pada sistem informasi akademik kampus.",
    sortOrder: 1,
  },
  {
    id: "default-va-2",
    title: "Pilih menu Riwayat Keuangan",
    description: "Klik profil, lalu pilih Riwayat Keuangan.",
    sortOrder: 2,
  },
  {
    id: "default-va-3",
    title: "Pilih tagihan",
    description: "Centang pada tagihan yang ingin dibayar.",
    sortOrder: 3,
  },
  {
    id: "default-va-4",
    title: "Klik Generated Virtual Account",
    description: "Klik tombol Generated Virtual Account.",
    sortOrder: 4,
  },
  {
    id: "default-va-5",
    title: "Berhasil mendapat Virtual Account",
    description:
      "Simpan kode VA yang didapatkan dan bayarkan sebelum jatuh tempo (expired kode pembayaran).",
    sortOrder: 5,
  },
];

const DEFAULT_CHANNELS: PaymentChannelItem[] = [
  {
    id: "default-1",
    channelId: "atm-mandiri",
    name: "Pembayaran melalui ATM Mandiri",
    steps: [
      "Masukkan kartu ATM dan PIN.",
      "Pilih menu **BAYAR/BELI**, lalu pilih menu **LAINNYA → Multipayment**.",
      "Masukkan kode perusahaan/institusi, yaitu **89631** atau **EDUFIN** dari Kode Virtual Account (VA) pada Sistem Informasi Akademik (SIAKAD). Contoh: **8963157000001**.",
      "Konfirmasi: tekan **1**, kemudian tekan **OK**.",
      "Transaksi selesai.",
      "Simpan struk pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 1,
  },
  {
    id: "default-2",
    channelId: "livin-mandiri",
    name: "Pembayaran melalui Livin’ by Mandiri",
    steps: [
      "Login pada aplikasi Livin’ by Mandiri.",
      "Pilih menu **BAYAR/VA**.",
      "Pilih menu **PENDIDIKAN**.",
      "Ketik nama biller **“EDUFIN”** atau ketik kode biller **“89631”**.",
      "Input KODE BAYAR atau Nomor VA yang didapatkan dari Sistem Informasi Akademik. Contoh: **8963157000001**, lalu klik lanjutkan.",
      "Periksa kembali detail transaksi. Jika sudah benar, klik **Lanjut Bayar**.",
      "Pembayaran selesai. Struk bukti bayar dapat di-share dan di-download sebagai bukti pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 2,
  },
  {
    id: "default-3",
    channelId: "cabang-mandiri",
    name: "Pembayaran melalui Cabang Mandiri",
    steps: [
      "Ambil aplikasi setoran/transfer/kliring/inkaso dan isikan tanggal sesuai dengan tanggal pada saat melakukan transaksi.",
      "Beri tanda pada kolom: **Setoran ke Rekening Sendiri** jika sumber dana tunai, atau **Transfer** jika sumber dana dari rekening.",
      "Beri tanda pada kolom “Penduduk” jika penerima dan pengirim adalah penduduk Indonesia.",
      "Isi nama pengirim sesuai dengan nama penyetor.",
      "Isi nama penerima dengan **89631** atau **EduFin**.",
      "Isi nama Bank dengan **BANK MANDIRI**.",
      "Pada nomor rekening, isi dengan Kode Virtual Account (VA) dari Sistem Informasi Akademik (SIAKAD). Contoh: **8963157000001**.",
      "Beri tanda pada sumber dana transaksi (tunai/debet rekening).",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 3,
  },
  {
    id: "default-4",
    channelId: "mobile-banking-bank-lain",
    name: "Pembayaran melalui Mobile Banking bank lain",
    steps: [
      "Login aplikasi mobile banking.",
      "Pilih menu **TRANSFER KE BANK LAIN / ANTAR BANK** (ONLINE).",
      "Pilih bank tujuan **MANDIRI**.",
      "Input KODE BAYAR/VA pada rekening tujuan. Contoh: **8963100000001**.",
      "Input NOMINAL PEMBAYARAN sesuai dengan tagihan pada Sistem Informasi Akademik (SIAKAD).",
      "Pilih layanan atau metode transfer ONLINE.",
      "Klik LANJUTKAN.",
      "Apabila transaksi telah berhasil, STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran.",
    ],
    note: "Pastikan memilih metode/layanan transfer dengan jenis ONLINE (BUKAN RTGS dan BUKAN BI FAST).",
    technicalNoteTitle: "Ketentuan nominal pembayaran",
    technicalNote:
      "Saat menginput nominal tagihan pada Mobile Banking bank lain, pastikan nominal yang diinput hanya nominal tagihan saja. Abaikan biaya administrasi sebesar Rp4.000.",
    sortOrder: 4,
  },
  {
    id: "default-5",
    channelId: "atm-bank-lain",
    name: "Pembayaran melalui ATM bank lain",
    steps: [
      "Pilih menu **TRANSFER BANK LAIN** atau **TRANSFER ONLINE ANTAR BANK**.",
      "Masukkan kode bank **MANDIRI (008)** atau pilih bank yang dituju, yaitu MANDIRI.",
      "Masukkan KODE BAYAR (Nomor Virtual Account) pada kolom rekening tujuan. Contoh: **8963100000001**.",
      "Masukkan NOMINAL transfer sesuai tagihan yang tampil pada Sistem Informasi Akademik (SIAKAD).",
      "Konfirmasi pembayaran akan tampil pada layar. Apabila sudah sesuai, silakan lanjutkan hingga selesai.",
      "Transaksi sukses dan STRUK bukti bayar akan muncul. Simpan sebagai bukti pembayaran.",
    ],
    note: null,
    technicalNoteTitle: null,
    technicalNote: null,
    sortOrder: 5,
  },
];

function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|<strong>.*?<\/strong>)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("<strong>") && part.endsWith("</strong>")) {
          return <strong key={i}>{part.slice(8, -9)}</strong>;
        }
        return part;
      })}
    </>
  );
}

export function CaraPembayaranContent() {
  const { data } = useApi("public-payment-guide", () => paymentGuideApi.get());

  const s = data?.settings;
  const heroEyebrow = s?.heroEyebrow || "INFORMASI PEMBAYARAN";
  const heroTitle = s?.heroTitle || "Cara Pembayaran";
  const heroDescription =
    s?.heroDescription ||
    "Ikuti panduan berikut untuk membuat kode Virtual Account dari SiAkad dan membayar tagihan kuliah melalui berbagai kanal pembayaran.";

  const vaSectionEyebrow = s?.vaSectionEyebrow || "PANDUAN SIAKAD";
  const vaSectionTitle =
    s?.vaSectionTitle || "Generated kode bayar atau Virtual Account (VA)";
  const vaSectionDescription =
    s?.vaSectionDescription ||
    "Buat kode pembayaran melalui menu Riwayat Keuangan di sistem informasi akademik.";

  const vaImage1Url = s?.vaImage1Url || "/Screenshot%20from%202026-11-10%2009-21-35.png";
  const vaImage1Alt = s?.vaImage1Alt || "Menu profil SiAkad dengan pilihan Tagihan Mahasiswa";
  const vaImage1Caption =
    s?.vaImage1Caption ||
    "Buka menu profil, lalu pilih Tagihan Mahasiswa untuk melihat tagihan.";

  const vaImage2Url = s?.vaImage2Url || "/Screenshot%20from%202026-11-10%2009-21-49.png";
  const vaImage2Alt =
    s?.vaImage2Alt ||
    "Halaman Riwayat Keuangan dengan metode pembayaran Mandiri dan tombol Bayar Tagihan";
  const vaImage2Caption =
    s?.vaImage2Caption ||
    "Pada halaman keuangan, pilih metode pembayaran dan klik Bayar Tagihan.";

  const methodsSectionEyebrow = s?.methodsSectionEyebrow || "PILIH KANAL PEMBAYARAN";
  const methodsSectionTitle = s?.methodsSectionTitle || "Panduan pembayaran";
  const methodsSectionDescription =
    s?.methodsSectionDescription ||
    "Gunakan kode bayar atau nomor Virtual Account yang sudah diterbitkan melalui SiAkad.";

  const vaSteps =
    data?.vaSteps && data.vaSteps.length > 0 ? data.vaSteps : DEFAULT_VA_STEPS;

  const channels =
    data?.channels && data.channels.length > 0 ? data.channels : DEFAULT_CHANNELS;

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
        <span className="pmb-eyebrow">{heroEyebrow}</span>
        <h1>{heroTitle}</h1>
        <p>{heroDescription}</p>
      </header>

      <section
        aria-labelledby="pmb-payment-va-title"
        className="pmb-payment-section pmb-payment-va"
      >
        <div className="pmb-wrap">
          <div className="pmb-payment-heading">
            <span className="pmb-eyebrow">{vaSectionEyebrow}</span>
            <h2 id="pmb-payment-va-title">{vaSectionTitle}</h2>
            <p>{vaSectionDescription}</p>
          </div>

          <ol className="pmb-payment-steps">
            {vaSteps.map((step, index) => (
              <li className="pmb-payment-step" key={step.id || step.title || index}>
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
                alt={vaImage1Alt}
                height={872}
                src={vaImage1Url}
                width={1374}
              />
              <figcaption>
                <FormattedText text={vaImage1Caption} />
              </figcaption>
            </figure>
            <figure className="pmb-payment-image-card">
              <Image
                alt={vaImage2Alt}
                height={852}
                src={vaImage2Url}
                width={1379}
              />
              <figcaption>
                <FormattedText text={vaImage2Caption} />
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
            <span className="pmb-eyebrow">{methodsSectionEyebrow}</span>
            <h2 id="pmb-payment-method-title">{methodsSectionTitle}</h2>
            <p>{methodsSectionDescription}</p>
          </div>

          <div className="pmb-payment-method-grid">
            {channels.map((ch, index) => (
              <article
                className="pmb-payment-method"
                id={ch.channelId || `channel-${index}`}
                key={ch.id || ch.channelId || index}
              >
                <span className="pmb-payment-method-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{ch.name}</h3>
                <ol>
                  {ch.steps.map((st, sIdx) => (
                    <li key={sIdx}>
                      <FormattedText text={st} />
                    </li>
                  ))}
                </ol>

                {ch.note && (
                  <p className="pmb-payment-note">
                    <strong>Catatan:</strong> <FormattedText text={ch.note} />
                  </p>
                )}

                {ch.technicalNote && (
                  <aside className="pmb-payment-technical-note">
                    {ch.technicalNoteTitle && <h4>{ch.technicalNoteTitle}</h4>}
                    <p>
                      <FormattedText text={ch.technicalNote} />
                    </p>
                  </aside>
                )}
              </article>
            ))}
          </div>

          <Link className="pmb-payment-back-link" href="/pmb">
            <span aria-hidden="true">←</span> Kembali ke informasi PMB
          </Link>
        </div>
      </section>
    </main>
  );
}

