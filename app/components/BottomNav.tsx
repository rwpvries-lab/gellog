"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Icon, type IconName } from "@/src/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  matchPrefixes: string[];
};

const LEFT_ITEMS: NavItem[] = [
  {
    href: "/icecream/feed",
    label: "Home",
    icon: "GellogHome",
    matchPrefixes: ["/icecream/feed", "/feed"],
  },
  {
    href: "/map",
    label: "Map",
    icon: "GellogDirections",
    matchPrefixes: ["/map"],
  },
];

const RIGHT_ITEMS: NavItem[] = [
  {
    href: "/search",
    label: "Search",
    icon: "GellogSearch",
    matchPrefixes: ["/search"],
  },
  {
    href: "/icecream/profile",
    label: "Profile",
    icon: "GellogProfile",
    matchPrefixes: ["/profile", "/icecream/profile"],
  },
];

function NavIconLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.matchPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-70"
      style={{ color: isActive ? "var(--color-teal)" : "var(--color-text-secondary)" }}
    >
      <Icon
        name={item.icon}
        size={24}
        color="currentColor"
        strokeWidth={isActive ? 2.25 : 1.75}
      />
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="pointer-events-auto relative mx-auto max-w-2xl">
        <div
          className="relative overflow-visible"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Link
            href="/icecream/logs/new"
            className="absolute left-1/2 top-0 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition hover:brightness-110 active:brightness-95"
            style={{
              background: "var(--color-teal)",
              color: "var(--color-on-brand)",
              boxShadow:
                "0 4px 18px color-mix(in srgb, var(--color-teal) 45%, transparent)",
            }}
            aria-label="Log a new ice cream"
          >
            <Plus size={28} strokeWidth={2.5} aria-hidden />
          </Link>

          <div className="flex items-center justify-between gap-1 px-1 pb-2 pt-4">
            <div className="flex flex-1 items-center justify-evenly">
              {LEFT_ITEMS.map((item) => (
                <NavIconLink key={item.href} item={item} />
              ))}
            </div>

            <div className="w-14 shrink-0" aria-hidden />

            <div className="flex flex-1 items-center justify-evenly">
              {RIGHT_ITEMS.map((item) => (
                <NavIconLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
