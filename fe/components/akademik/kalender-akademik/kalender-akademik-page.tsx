import Image from "next/image";
import Link from "next/link";
import "./kalender-akademik.css";

const academicCalendars = [
  {
    id: "genap-2025-2026",
    title: "Semester Genap 2025/2026",
    src: "/image/kalender/kalendergenap2526.png",
    width: 2048,
    height: 1065,
  },
  {
    id: "gasal-2026-2027",
    title: "Semester Gasal 2026/2027",
    src: "/image/kalender/Kalender-2026-2027-Gasal.webp",
    width: 1728,
    height: 848,
  },
];

function CalendarCard({
  id,
  title,
  src,
  width,
  height,
}: (typeof academicCalendars)[number]) {
  return (
    <article aria-labelledby={`calendar-${id}`} className="academic-calendar-card">
      <h2 id={`calendar-${id}`}>Kalender Akademik {title}</h2>
      <div className="academic-calendar-image">
        <Image
          alt={`Kalender Akademik ${title}`}
          height={height}
          sizes="(max-width: 760px) calc(100vw - 42px), (max-width: 1120px) calc(100vw - 64px), 1056px"
          src={src}
          width={width}
        />
      </div>
    </article>
  );
}

export function KalenderAkademikPage() {
  return (
    <main className="academic-calendar-page">
      <header className="academic-calendar-heading">
        <nav aria-label="Breadcrumb" className="academic-calendar-breadcrumb">
          <Link href="/">Beranda</Link>
          <span aria-hidden="true">›</span>
          <span>Akademik</span>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Kalender Akademik</span>
        </nav>
        <span className="academic-calendar-eyebrow">AKADEMIK UNIVERSITAS LIA</span>
        <h1>Kalender Akademik</h1>
      </header>
      <div className="academic-calendar-list">
        {academicCalendars.map((calendar) => (
          <CalendarCard key={calendar.src} {...calendar} />
        ))}
      </div>
    </main>
  );
}
