import { Icon, IconName } from "@/components/icons";

export interface QuickLinkItem {
  name: string;
  detail: string;
  icon: IconName;
  href?: string;
}

const defaultQuickLinks: QuickLinkItem[] = [
  { name: "SIAKAD UL", detail: "Sistem informasi akademik", icon: "graduate", href: "#footer" },
  { name: "E-Learning", detail: "Pembelajaran melalui Edlink", icon: "monitor", href: "#footer" },
  { name: "Perpustakaan", detail: "Sumber belajar dan referensi", icon: "book", href: "#footer" },
  { name: "Informasi PMB", detail: "Panduan calon mahasiswa", icon: "file", href: "#footer" },
  { name: "E-Journal", detail: "Publikasi ilmiah dan jurnal", icon: "book", href: "#footer" },
];

export function QuickLinks({ items = defaultQuickLinks }: { items?: QuickLinkItem[] }) {
  return (
    <section aria-label="Layanan kampus" className="quick-links">
      <div className="quick-links-inner">
        {items.map((item) => (
          <a className="quick-link" href={item.href ?? "#footer"} key={item.name}>
            <span className="quick-icon">
              <Icon name={item.icon} size={25} />
            </span>
            <span className="quick-copy">
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
            </span>
            <span className="quick-arrow">
              <Icon name="arrow" size={15} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
