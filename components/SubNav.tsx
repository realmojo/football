"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ league }: { league: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/${league}`, label: "순위" },
    { href: `/${league}/matches`, label: "일정 · 결과" },
  ];
  return (
    <nav className="subnav">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={pathname === t.href ? "active" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
