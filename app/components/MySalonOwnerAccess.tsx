"use client";

import { useClaimedSalons } from "@/src/hooks/useClaimedSalons";
import { ChevronRight, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type CSSProperties } from "react";
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

/** Full-width card on ice cream profile (below quick actions), Figma-style row. */
export function MySalonProfileCard() {
  const { salons, ready } = useClaimedSalons();
  const { pickerOpen, setPickerOpen, go } = useSalonDashboardNavigation();

  if (!ready || salons.length === 0) return null;

  const subtitle =
    salons.length === 1 ? salons[0]!.salon_name : `${salons.length} locations`;

  const cardClass =
    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:opacity-95";
  const cardStyle: CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };

  const inner = (
    <>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--color-teal-bg)" }}
      >
        <Store
          className="h-5 w-5"
          strokeWidth={2}
          style={{ color: "var(--color-teal)" }}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="font-semibold leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          My Salon
        </p>
        <p
          className="truncate text-sm leading-snug"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0"
        style={{ color: "var(--color-text-tertiary)" }}
        strokeWidth={2}
        aria-hidden
      />
    </>
  );

  if (salons.length === 1) {
    const s = salons[0]!;
    return (
      <Link
        href={`/salon/${s.place_id}/dashboard`}
        className={cardClass}
        style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cardClass}
        style={{ ...cardStyle, cursor: "pointer" }}
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

