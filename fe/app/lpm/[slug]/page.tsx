import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LpmContent, lpmSections } from "@/components/lpm/lpm-content";

export function generateStaticParams() {
  return lpmSections
    .filter((section) => section.slug !== "lembaga-penjaminan-mutu")
    .map((section) => ({ slug: section.slug }));
}

type LpmParams = Promise<{ slug: string }>;

interface LpmPageProps {
  params: LpmParams;
}

export default function LpmSectionPage({
  params,
}: LpmPageProps) {
  return (
    <Suspense
      fallback={
        <main className="lpm-content-page">
          <p className="lpm-content-loading" role="status">
            Memuat informasi LPM...
          </p>
        </main>
      }
    >
      <LpmSectionContent params={params} />
    </Suspense>
  );
}

async function LpmSectionContent({ params }: { params: LpmParams }) {
  const { slug } = await params;
  const section = lpmSections.find((item) => item.slug === slug);

  if (!section || section.slug === "lembaga-penjaminan-mutu") {
    notFound();
  }

  return <LpmContent slug={slug} />;
}
