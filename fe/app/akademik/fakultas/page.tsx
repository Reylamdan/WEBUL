import {
  FacultyContent,
  FacultyContactButton,
  FacultyHero,
} from "@/components/akademik";

export default function FacultiesPage() {
  return (
    <main className="faculty-page">
      <div aria-hidden="true" className="faculty-top-space" />

      <div className="faculty-content">
        <FacultyHero />
        <FacultyContent />
      </div>
      <FacultyContactButton />
    </main>
  );
}
