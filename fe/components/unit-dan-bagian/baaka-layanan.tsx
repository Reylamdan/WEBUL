import { ScrollReveal } from "@/components/scroll-reveal";

export function BaakaLayanan() {
  const layananList = [
    {
      title: "Loket Layanan Mahasiswa Terpadu",
      description:
        "Pelayanan tatap muka untuk validasi dokumen, pengurusan kartu mahasiswa, surat pengantar beasiswa, dan konsultasi administrasi perkuliahan.",
    },
    {
      title: "Integrasi SIAKAD & Portal Akademik",
      description:
        "Sistem digital mandiri untuk pengisian KRS daring, pengecekan jadwal kuliah, pencetakan KHS/KPU, dan pemantauan riwayat nilai mahasiswa.",
    },
    {
      title: "Layanan Legalisir & Verifikasi Ijazah",
      description:
        "Pelayanan legalisir dokumen resmi kelulusan serta verifikasi keaslian ijazah bagi instansi dan perusahaan mitra kerja lulusan.",
    },
    {
      title: "Konseling & Pendampingan Kemahasiswaan",
      description:
        "Layanan advokasi dan pendampingan bagi mahasiswa yang mengalami kendala studi, pengajuan izin khusus, serta bimbingan ormawa.",
    },
  ];

  return (
    <ScrollReveal delay={210}>
      <section aria-labelledby="baaka-layanan-title" className="upt-section upt-wrap">
        <div className="upt-section-header">
          <span className="upt-eyebrow">INFORMASI LAYANAN</span>
          <h2 className="upt-section-title" id="baaka-layanan-title">
            Fokus Layanan Administrasi BAAKA
          </h2>
          <p className="upt-section-desc">
            Sarana pendukung operasional akademik dan kemahasiswaan untuk menjamin kenyamanan studi di lingkungan Universitas LIA.
          </p>
        </div>

        <div className="upt-layanan-grid">
          {layananList.map((item) => (
            <div className="upt-layanan-card" key={item.title}>
              <div className="upt-layanan-accent" />
              <div className="upt-layanan-body">
                <h3 className="upt-layanan-card-title">{item.title}</h3>
                <p className="upt-layanan-card-desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

