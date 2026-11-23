import type { CSSProperties } from "react";

import { Icon, IconName } from "@/components/icons";
import { SmartLink } from "@/components/smart-link";

export interface QuickLinkItem {
  name: string;
  detail: string;
  icon: IconName;
  href?: string;
}

export function QuickLinks({ items }: { items: QuickLinkItem[] }) {
  const columns = Math.min(Math.max(items.length, 1), 5);

  return (
    <section aria-label="Layanan kampus" className="lp-access">
      <div className="lp-wrap">
        <ul className="lp-access-list" style={{ "--lp-cols": columns } as CSSProperties}>
          {items.map((item) => (
            <li key={item.name}>
              <SmartLink className="lp-access-item" href={item.href ?? "#footer"}>
                <span className="lp-access-top">
                  <Icon name={item.icon} size={22} />
                  <Icon className="lp-access-arrow" name="arrow" size={16} />
                </span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </SmartLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
