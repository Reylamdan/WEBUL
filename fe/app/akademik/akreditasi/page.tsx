import {
  AkreditasiHero,
  AkreditasiTable,
} from "@/components/akreditasi";

export default function AkreditasiPage() {
  return (
    <main className="akreditasi-page">
      <div aria-hidden="true" className="faculty-top-space" />
      <div className="akreditasi-content">
        <AkreditasiHero />
        <AkreditasiTable />
      </div>
    </main>
  );
}
