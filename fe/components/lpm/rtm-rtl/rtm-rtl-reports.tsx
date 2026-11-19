"use client";

import { LpmContent, type LpmSectionOverride } from "@/components/lpm/lpm-content";
import { resolveApiUrl } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { lpmRtmRtlReportApi, type RtmRtlReport } from "@/lib/lpm-rtm-rtl-report-api";

const LIST_PATH = "/lpm/laporan-lpm/laporan-tahunan-rtm-rtl";

export const rtmRtlDetailHref = (year: number) =>
  `${LIST_PATH}/laporan-rtm-dan-rtl-${year}`;

// Halaman daftar tahun: /lpm/laporan-lpm/laporan-tahunan-rtm-rtl
export function RtmRtlReportList() {
  const { data, error } = useApi("rtm-rtl-list", () => lpmRtmRtlReportApi.list());

  // Selama memuat atau jika API gagal, tampilkan isi statis agar halaman tidak kosong.
  let override: LpmSectionOverride | undefined;

  if (data && !error) {
    override = {
      entries:
        data.items.length > 0
          ? data.items.map((report) => ({
              title: String(report.year),
              description:
                report.description ||
                `Informasi dan dokumen laporan tahunan RTM dan RTL tahun ${report.year}.`,
              href: rtmRtlDetailHref(report.year),
              meta: report.file ? (report.fileType ?? "DOKUMEN") : "ARSIP",
            }))
          : [
              {
                title: "Belum ada laporan",
                description: "Laporan tahunan RTM dan RTL belum dipublikasikan.",
                meta: "ARSIP BELUM TERSEDIA",
              },
            ],
    };
  }

  return <LpmContent override={override} sectionId="laporan-tahunan-rtm-rtl" />;
}

const unavailable = (year: number): LpmSectionOverride["entries"] => [
  {
    title: "Menunggu publikasi atau verifikasi",
    description: `Dokumen laporan RTM dan RTL ${year} belum tersedia untuk ditampilkan. Informasi akan diperbarui setelah arsip resmi dipublikasikan atau diverifikasi.`,
    meta: "ARSIP BELUM TERSEDIA",
  },
];

function detailOverride(year: number, report?: RtmRtlReport): LpmSectionOverride {
  const title = report?.title || `Laporan RTM dan RTL ${year}`;
  const previewUrl = resolveApiUrl(report?.file?.url);
  const downloadUrl = resolveApiUrl(report?.file?.downloadUrl);

  return {
    label: title,
    title,
    description:
      report?.description ||
      `Informasi laporan Rapat Tinjauan Manajemen dan Rencana Tindak Lanjut tahun ${year}.`,
    entries:
      report?.file && previewUrl
        ? [
            {
              title: report.fileName || title,
              description: "Dokumen resmi laporan RTM dan RTL.",
              meta: report.fileType ?? "DOKUMEN",
              actions: [
                { label: "Lihat dokumen", href: previewUrl },
                ...(downloadUrl
                  ? [{ label: "Unduh", href: downloadUrl, download: true }]
                  : []),
              ],
            },
          ]
        : unavailable(year),
  };
}

// Halaman detail: /lpm/laporan-lpm/laporan-tahunan-rtm-rtl/laporan-rtm-dan-rtl-{tahun}
export function RtmRtlReportDetail({ year }: { year: number }) {
  const { data, error } = useApi(`rtm-rtl-${year}`, () =>
    lpmRtmRtlReportApi.getByYear(year),
  );

  // Tahun yang belum diterbitkan (404) atau API gagal tetap memakai tampilan "arsip belum tersedia".
  const override = detailOverride(year, error ? undefined : data?.report);

  return <LpmContent override={override} sectionId="laporan-rtm-rtl-2025" />;
}
