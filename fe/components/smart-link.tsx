import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

// Link internal ("/...") memakai next/link agar pindah halaman tanpa reload penuh. Reload penuh
// membuat HTML Indonesia sempat tampil sebelum terjemahan EN selesai. Anchor (#...) dan URL
// eksternal tetap memakai <a> biasa.
export function SmartLink({
  href,
  children,
  ...rest
}: { href: string; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}