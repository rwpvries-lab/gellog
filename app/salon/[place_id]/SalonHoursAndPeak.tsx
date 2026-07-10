"use client";

import { useEffect, useState } from "react";
import { OpeningHoursCard } from "@/src/components/OpeningHoursCard";
import { type WeekHours } from "@/src/lib/opening-hours";
import type { PeakGridPayload } from "@/src/lib/salonPeakGrid";

function peakChips(data: PeakGridPayload): { quietHour: number | null; busyHour: number | null } {
  const todayRow = (new Date().getDay() + 6) % 7;
  const row = data.grid[todayRow];
  if (!row) return { quietHour: null, busyHour: null };

  const open = row
    .map((score, idx) => ({ score, hour: 9 + idx }))
    .filter((c): c is { score: number; hour: number } => c.score !== null);

  if (open.length === 0) return { quietHour: null, busyHour: null };

  const quietHour = open.reduce((a, b) => (a.score <= b.score ? a : b)).hour;
  const busyHour = open.reduce((a, b) => (a.score >= b.score ? a : b)).hour;
  return { quietHour, busyHour };
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;
}

type Props = {
  placeId: string;
  isOwner: boolean;
  /** Peak chips only render on salons with logged visits (matches prior behaviour). */
  showPeak: boolean;
};

/**
 * Renders after first paint by design: `/hours` may fan out to Google Places
 * on a stale cache, so it must never block the salon page's critical path.
 */
export function SalonHoursAndPeak({ placeId, isOwner, showPeak }: Props) {
  const [hours, setHours] = useState<WeekHours | null>(null);
  const [peakData, setPeakData] = useState<PeakGridPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/salon/${encodeURIComponent(placeId)}/hours`)
      .then((r) => (r.ok ? (r.json() as Promise<{ hours: WeekHours | null }>) : null))
      .then((data) => {
        if (!cancelled) setHours(data?.hours ?? null);
      })
      .catch(() => {
        if (!cancelled) setHours(null);
      });

    if (showPeak) {
      fetch(`/api/salon/${encodeURIComponent(placeId)}/peak`)
        .then((r) => (r.ok ? (r.json() as Promise<PeakGridPayload>) : null))
        .then((data) => {
          if (!cancelled) setPeakData(data);
        })
        .catch(() => {
          if (!cancelled) setPeakData(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [placeId, showPeak]);

  return (
    <>
      {hours && (
        <div className="mb-5">
          <OpeningHoursCard hours={hours} isOwner={isOwner} placeId={placeId} />
        </div>
      )}

      {showPeak &&
        peakData &&
        peakData.total_count >= 20 &&
        (() => {
          const { quietHour, busyHour } = peakChips(peakData);
          if (quietHour === null) return null;
          return (
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
                Quieter at {fmtHour(quietHour)} today
              </span>
              {busyHour !== null && busyHour !== quietHour && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
                  Likely busy at {fmtHour(busyHour)}
                </span>
              )}
            </div>
          );
        })()}
    </>
  );
}
