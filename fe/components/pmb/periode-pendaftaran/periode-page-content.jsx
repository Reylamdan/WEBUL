"use client";

import { useApi } from "@/lib/use-api";
import { registrationPeriodApi } from "@/lib/api";
import { PeriodeHeader } from "./periode-header";
import { PeriodeTable } from "./periode-table";

export function PeriodePageContent() {
  const { data } = useApi("public-registration-periods", () => registrationPeriodApi.get());
  const settings = data?.settings;
  const waves = data?.waves;

  return (
    <main className="pmb-period-page">
      <PeriodeHeader settings={settings} />
      <PeriodeTable settings={settings} waves={waves} />
    </main>
  );
}

