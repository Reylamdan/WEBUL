import { Icon, IconName } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SmartLink } from "@/components/smart-link";

export interface QuickLinkItem {
  name: string;
  detail: string;
  icon: IconName;
  href?: string;
}

export function QuickLinks({ items }: { items: QuickLinkItem[] }) {
  return (
    <ScrollReveal>
      <section aria-label="Layanan kampus" className="quick-links">
        <div className="quick-links-inner">
          {items.map((item) => (
            <SmartLink className="quick-link" href={item.href ?? "#footer"} key={item.name}>
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
            </SmartLink>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}