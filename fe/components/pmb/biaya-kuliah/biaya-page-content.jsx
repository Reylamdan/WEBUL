"use client";

import { useApi } from "@/lib/use-api";
import { tuitionFeeApi } from "@/lib/api";
import { BiayaHeader } from "./biaya-header";
import { BiayaTable } from "./biaya-table";

export function BiayaPageContent() {
  const { data } = useApi("public-tuition-fees", () => tuitionFeeApi.get());
  const settings = data?.settings;
  const waves = data?.waves;

  return (
    <main className="pmb-tuition-page">
      <BiayaHeader settings={settings} />
      <BiayaTable settings={settings} waves={waves} />
    </main>
  );
}

