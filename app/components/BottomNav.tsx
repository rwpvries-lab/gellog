"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/src/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  matchPrefixes: string[];
};

const navItems: NavItem[] = [
  {
    href: "/feed",
    label: "Feed",
    icon: "GellogFeed",
    matchPrefixes: ["/feed", "/icecream/feed"],
  },
  {
    href: "/search",
    label: "Search",
    icon: "GellogSearch",
    matchPrefixes: ["/search"],
  },
  {
    href: "/map",
    label: "Map",
    icon: "GellogDirections",
    matchPrefixes: ["/map"],
  },
  {
    href: "/log",
    label: "Log",
    icon: "GellogLog",
    matchPrefixes: ["/log", "/icecream/logs/new"],
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "GellogProfile",
    matchPrefixes: ["/profile", "/icecream/profile"],
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-xl items-center justify-around px-4 py-2.5">
        {navItems.map((item) => {
          const isActive = item.matchPrefixes.some((prefix) =>
            pathname.startsWith(prefix),
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group inline-flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-teal-700 dark:text-teal-300"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-teal-500 text-white ring-orange-200/80 dark:ring-teal-700/70"
                    : "bg-zinc-50 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700"
                }`}
              >
                <Icon name={item.icon} size={18} strokeWidth={1.75} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

