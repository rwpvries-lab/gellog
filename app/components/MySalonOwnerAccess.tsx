"use client";

import { useClaimedSalons } from "@/src/hooks/useClaimedSalons";
import { Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SalonPickerSheet } from "./SalonPickerSheet";

function useSalonDashboardNavigation() {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  const go = useCallback(
    (placeId: string) => {
      setPickerOpen(false);
      router.push(`/salon/${placeId}/dashboard`);
    },
    [router],
  );

  return { pickerOpen, setPickerOpen, go };
}

/** Top-right on ice cream profile: storefront icon + “My Salon”. Hidden if user owns no claimed salons. */
export function MySalonProfileShortcut() {
  const { salons, ready } = useClaimedSalons();
  const { pickerOpen, setPickerOpen, go } = useSalonDashboardNavigation();

  if (!ready || salons.length === 0) return null;

  if (salons.length === 1) {
    const s = salons[0]!;
    return (
      <div className="flex justify-end">
        <Link
          href={`/salon/${s.place_id}/dashboard`}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:border-teal-700 dark:hover:bg-teal-950/40"
        >
          <Store className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          My Salon
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:border-teal-700 dark:hover:bg-teal-950/40"
        >
          <Store className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          My Salon
        </button>
      </div>
      <SalonPickerSheet
        open={pickerOpen}
        salons={salons}
        onClose={() => setPickerOpen(false)}
        onPick={go}
      />
    </>
  );
}

function navItemClass(active: boolean) {
  return `group inline-flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "text-teal-700 dark:text-teal-300"
      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
  }`;
}

function navIconWrap(active: boolean) {
  return `flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ${
    active
      ? "bg-gradient-to-br from-orange-500 to-teal-500 text-white ring-orange-200/80 dark:ring-teal-700/70"
      : "bg-zinc-50 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700"
  }`;
}

/**
 * Extra bottom-nav slot for claimed salon owners only.
 * Single salon: link. Multiple: opens picker sheet.
 */
export function MySalonBottomNavItem() {
  const { salons, ready } = useClaimedSalons();
  const pathname = usePathname();
  const { pickerOpen, setPickerOpen, go } = useSalonDashboardNavigation();

  if (!ready || salons.length === 0) return null;

  const isActive = salons.some((s) => pathname.startsWith(`/salon/${s.place_id}/dashboard`));

  const inner = (
    <>
      <span className={navIconWrap(isActive)}>
        <Store className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="max-w-[4.5rem] truncate">My Salon</span>
    </>
  );

  if (salons.length === 1) {
    const s = salons[0]!;
    return (
      <Link href={`/salon/${s.place_id}/dashboard`} className={navItemClass(isActive)}>
        {inner}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={`${navItemClass(isActive)} border-0 bg-transparent p-0`}
      >
        {inner}
      </button>
      <SalonPickerSheet
        open={pickerOpen}
        salons={salons}
        onClose={() => setPickerOpen(false)}
        onPick={go}
      />
    </>
  );
}
