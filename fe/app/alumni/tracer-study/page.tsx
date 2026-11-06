import { AlumniHero, AlumniSection, AlumniCard } from "@/components/alumni";
import { Icon } from "@/components/icons";
import Link from "next/link";

export const metadata = {
  title: "Tracer Study - Universitas LIA",
  description: "Kuesioner pelacakan alumni Universitas LIA",
};

export default function TracerStudyPage() {
  return (
    <main>
      <AlumniHero
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Alumni", href: "/alumni" },
          { label: "Tracer Study" },
        ]}
        subtitle="Bantu kami memahami perjalanan alumni dan memberikan masukan untuk pengembangan kualitas pendidikan."
        title="Tracer Study Alumni"
      />

      <AlumniSection
        eyebrow="TRACER STUDY"
        id="tracer-study-info"
        title="Informasi Tracer Study"
      >
        <AlumniCard
          description="Tracer Study merupakan studi penelusuran lulusan untuk memantau transisi alumni setelah menyelesaikan pendidikan, pengalaman yang diperoleh, dan relevansi kurikulum dengan dunia kerja."
          title="Tentang Tracer Study"
        />
        <AlumniCard
          description="Data yang terkumpul akan digunakan sebagai dasar evaluasi program studi dan peningkatan layanan pendidikan bagi mahasiswa."
          title="Manfaat Pengisian"
        />
        <AlumniCard
          description="Seluruh data yang diberikan akan dijaga kerahasiaannya dan hanya digunakan untuk kepentingan pengembangan institusi."
          title="Privasi Data"
        />
        <AlumniCard
          description="Klik tombol di bawah untuk mulai mengisi kuesioner. Terima kasih atas partisipasi Anda."
          title="Isi Kuesioner Alumni"
        >
          <Link className="button button-primary" href="#">
            Isi Kuesioner <Icon name="arrow" size={16} />
          </Link>
        </AlumniCard>
      </AlumniSection>
    </main>
  );
}
