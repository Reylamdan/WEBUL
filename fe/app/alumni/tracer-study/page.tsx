import { AlumniHero } from "@/components/alumni";
import { TracerForm } from "@/components/alumni/tracer-study";

export const metadata = {
  title: "Tracer Study - Universitas LIA",
  description: "Isi form tracer study alumni Universitas LIA",
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
        subtitle="Isi data diri dan jawaban tracer study Anda untuk membantu Universitas LIA terus berkembang. Kirim langsung, atau lewat tembakan basketball!"
        title="Tracer Study Alumni"
      />

      <TracerForm />
    </main>
  );
}