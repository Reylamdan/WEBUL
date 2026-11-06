import { AlumniHero, AlumniSection, AlumniCard } from "@/components/alumni";

export const metadata = {
  title: "Ikatan Alumni - Universitas LIA",
  description: "Informasi mengenai Ikatan Alumni Universitas LIA",
};

export default function IkatanAlumniPage() {
  return (
    <main>
      <AlumniHero
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Alumni", href: "/alumni" },
          { label: "Ikatan Alumni" },
        ]}
        subtitle="Ruang untuk menjaga silaturahmi, memperluas jejaring, dan mendorong kolaborasi antar alumni."
        title="Ikatan Alumni Universitas LIA"
      />

      <AlumniSection
        eyebrow="IKATAN ALUMNI"
        id="ikatan-alumni-info"
        title="Informasi Ikatan Alumni"
      >
        <AlumniCard
          description="Ikatan Alumni menjadi wadah resmi untuk mempererat hubungan lulusan dengan almamater, memfasilitasi komunikasi, dan mendukung kemajuan universitas."
          title="Tentang Ikatan Alumni"
        />
        <AlumniCard
          description="Menjalin kemitraan strategis, mendukung pengembangan karier alumni, dan memberikan kontribusi nyata bagi masyarakat."
          title="Tujuan dan Manfaat"
        />
        <AlumniCard
          description="Temukan informasi mengenai reuni, seminar, workshop, dan berbagai kegiatan sosial lainnya yang diselenggarakan oleh ikatan alumni."
          title="Ruang Kegiatan Alumni"
        />
        <AlumniCard
          description="Daftarkan diri Anda untuk menjadi bagian dari database ikatan alumni agar mendapatkan informasi terbaru mengenai program dan kegiatan."
          title="Informasi Keanggotaan"
        />
      </AlumniSection>
    </main>
  );
}
