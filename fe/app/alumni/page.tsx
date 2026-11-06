import { AlumniHero, AlumniSection, AlumniCard } from "@/components/alumni";

export const metadata = {
  title: "Alumni - Universitas LIA",
  description: "Informasi seputar alumni Universitas LIA",
};

export default function AlumniPage() {
  return (
    <main>
      <AlumniHero
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Alumni" },
        ]}
        subtitle="Tetap terhubung dengan almamater, berbagi pengalaman, dan menjalin hubungan yang bermakna dalam jaringan luas."
        title="Alumni Universitas LIA"
      />

      <AlumniSection
        description="Berbagai informasi dan layanan bagi para lulusan Universitas LIA."
        eyebrow="TENTANG ALUMNI"
        id="informasi-alumni"
        title="Tentang Alumni"
      >
        <AlumniCard
          description="Alumni merupakan bagian penting dari perjalanan Universitas LIA. Halaman ini menjadi ruang informasi untuk menjaga hubungan antara lulusan, mahasiswa, dan almamater serta membuka peluang berbagi pengalaman."
          title="Tentang Alumni"
        />
        <AlumniCard
          description="Cerita perjalanan sukses para alumni Universitas LIA yang telah berkontribusi di berbagai bidang profesional."
          title="Jejak dan Pencapaian Alumni"
        />
        <AlumniCard
          description="Bangun koneksi lintas angkatan, temukan relasi baru, dan manfaatkan kesempatan kolaborasi profesional."
          title="Jaringan Alumni"
        />
        <AlumniCard
          description="Kenali komunitas Alumni LIA dan dapatkan informasi mengenai kegiatan maupun keanggotaan ikatan alumni universitas."
          title="Terhubung Lebih Dekat"
        />
      </AlumniSection>
    </main>
  );
}
