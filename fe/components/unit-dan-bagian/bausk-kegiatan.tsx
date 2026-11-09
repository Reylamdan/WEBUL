import { ScrollReveal } from "@/components/scroll-reveal";

export function BauskKegiatan() {
  const kegiatanList = [
    {
      number: "01",
      category: "Sarana & Prasarana",
      title: "Pemeliharaan & Pengadaan Sarpras",
      description:
        "Pelaksanaan urusan pemeliharaan dan pengadaan Sarana dan Prasarana kampus secara berkala guna mendukung kegiatan perkuliahan dan operasional institusi.",
    },
    {
      number: "02",
      category: "Manajemen Aset",
      title: "Pengelolaan Aset Institusi",
      description:
        "Pelaksanaan urusan pengelolaan aset, inventarisasi barang milik universitas, pendataan nilai kapital, dan pemeliharaan legalitas aset kampus.",
    },
    {
      number: "03",
      category: "Keuangan Mahasiswa",
      title: "Penerimaan UKT & Biaya Pendidikan",
      description:
        "Pelaksanaan urusan penerimaan Uang Kuliah Tunggal (UKT), biaya registrasi, dan penerimaan pembayaran operasional akademik lainnya secara terintegrasi.",
    },
    {
      number: "04",
      category: "Operasional Kampus",
      title: "Pembiayaan Operasional Universitas",
      description:
        "Pelaksanaan urusan pembiayaan operasional rutin, pengadaan logistik kantor, operasional tridharma fakultas, dan realisasi anggaran universitas.",
    },
    {
      number: "05",
      category: "Akuntansi & Audit",
      title: "Akuntansi & Pelaporan Keuangan",
      description:
        "Pelaksanaan urusan akuntansi, pembukuan kas, penyusunan laporan keuangan periodik standar PSAK, serta koordinasi pelaksanaan audit keuangan tahunan.",
    },
    {
      number: "06",
      category: "Kepegawaian",
      title: "Pelayanan Kepegawaian Dosen & Tendik",
      description:
        "Pelaksanaan urusan pelayanan kepegawaian bagi dosen dan tenaga kependidikan (tendik), administrasi kepangkatan, presensi, dan jaminan kesejahteraan.",
    },
    {
      number: "07",
      category: "Pengembangan SDM",
      title: "Pengembangan Kompetensi Dosen & Tendik",
      description:
        "Pelaksanaan urusan pengembangan kompetensi dosen dan tendik melalui fasilitasi pelatihan profesional, sertifikasi keahlian, studi lanjut, dan asesmen mutu.",
    },
  ];

  return (
    <ScrollReveal delay={140}>
      <section aria-labelledby="bausk-kegiatan-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">TUGAS &amp; FUNGSI UTAMA</span>
          <h2 className="upt-section-title" id="bausk-kegiatan-title">
            Kegiatan Operasional BAUSK
          </h2>
          <p className="upt-section-desc">
            Tujuh pilar urusan utama yang dilaksanakan oleh Bagian Administrasi Umum, SDM dan Keuangan:
          </p>
        </div>

        <div className="upt-tugas-cards">
          {kegiatanList.map((item) => (
            <article className="upt-tugas-card" key={item.number}>
              <div className="upt-tugas-header">
                <span className="upt-tugas-number">{item.number}</span>
                <span className="upt-tugas-category">{item.category}</span>
              </div>
              <h3 className="upt-tugas-card-title">{item.title}</h3>
              <p className="upt-tugas-card-desc">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

