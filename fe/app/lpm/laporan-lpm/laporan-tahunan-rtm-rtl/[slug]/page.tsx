import { notFound } from "next/navigation";
import { RtmRtlReportDetail } from "@/components/lpm/rtm-rtl/rtm-rtl-reports";

// Slug berformat "laporan-rtm-dan-rtl-{tahun}", mis. laporan-rtm-dan-rtl-2025.
export default async function LaporanRtmDanRtlPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const match = /^laporan-rtm-dan-rtl-(\d{4})$/.exec(slug);

  if (!match) notFound();

  return <RtmRtlReportDetail year={Number(match[1])} />;
}
