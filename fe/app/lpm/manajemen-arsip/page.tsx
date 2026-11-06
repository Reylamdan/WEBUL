import {
  ManajemenArsipHero,
  ManajemenArsipTable,
} from "@/components/lpm";

export default function ManajemenArsipPage() {
  return (
    <main className="manajemen-arsip-page">
      <div aria-hidden="true" className="faculty-top-space" />
      <div className="manajemen-arsip-content">
        <ManajemenArsipHero />
        <ManajemenArsipTable />
      </div>
    </main>
  );
}
