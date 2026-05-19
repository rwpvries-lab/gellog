"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DAYS,
  isOpenNow,
  todayKey,
  type DayHours,
  type WeekHours,
} from "@/src/lib/opening-hours";

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function formatDayHours(h: DayHours): string {
  if (h.closed) return "Closed";
  return `${h.open} – ${h.close}`;
}

type Props = {
  hours: WeekHours;
  isOwner: boolean;
  placeId: string;
};

export function OpeningHoursCard({ hours, isOwner, placeId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const openNow = isOpenNow(hours);
  const currentDay = todayKey();
  const todayH = hours[currentDay];

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Opening hours
        </h2>
        {isOwner && (
          <Link
            href={`/salon/${placeId}/dashboard#opening-hours`}
            className="text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
          >
            Edit →
          </Link>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${
            openNow
              ? "bg-[color:var(--brand-primary)]"
              : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        />
        <span className="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {openNow ? "Open now" : "Closed now"}
        </span>
        {!todayH.closed && (
          <span className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
            · {todayH.open}–{todayH.close}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2.5 flex items-center gap-1 text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <span>{expanded ? "Hide hours" : "Show all hours"}</span>
        <span
          aria-hidden
          className={`inline-block transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className={`flex justify-between gap-4 text-sm ${
                day === currentDay
                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <span>{DAY_LABELS[day]}</span>
              <span className="tabular-nums">{formatDayHours(hours[day])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
