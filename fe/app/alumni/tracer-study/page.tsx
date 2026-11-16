import { AlumniHero } from "@/components/alumni";
import { TracerStudy } from "@/components/alumni/tracer-study";

export const metadata = {
  title: "Tracer Study - Universitas LIA",
  description: "Statistik tracer study alumni Universitas LIA",
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
        subtitle="Gambaran perjalanan karier alumni Universitas LIA berdasarkan hasil survei tracer study."
        title="Tracer Study Alumni"
      />

      <TracerStudy />
    </main>
  );
}