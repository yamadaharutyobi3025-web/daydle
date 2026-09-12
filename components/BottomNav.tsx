"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "今日" },
  { href: "/community", label: "みんな" },
  { href: "/record", label: "記録" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 border-t border-line/60 bg-cream/90 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-sm items-center justify-around py-2.5">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`touch-manipulation flex -mx-3 -my-1.5 flex-col items-center gap-1 px-7 py-3 text-xs tracking-wide transition-colors ${
                  active ? "text-ink" : "text-ink-soft/70"
                }`}
              >
                {item.label}
                <span
                  className={`h-1 w-1 rounded-full transition-opacity ${
                    active ? "bg-sage opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
