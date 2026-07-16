"use client";

import { useState } from "react";
import type { DashboardData } from "./types";

function formatVisibilityLogInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekAgoStart = new Date(todayStart.getTime() - 6 * 86400000);
  const hhmm = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (d >= todayStart) return `Today at ${hhmm}`;
  if (d >= yesterdayStart) return `Yesterday at ${hhmm}`;
  if (d >= weekAgoStart) return `${d.toLocaleDateString(undefined, { weekday: "short" })} at ${hhmm}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${dateStr} at ${hhmm}`;
}

export function LogCleanupHistoryWidget({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  const { visibilityLog, flavourNameById } = data;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Log cleanup history</span>
        <span
          className={`inline-block shrink-0 text-zinc-400 transition-transform duration-200 ease-out dark:text-zinc-500 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>
      </button>
      <div
        aria-hidden={!open}
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${open ? "max-h-[4000px]" : "max-h-0"} ${!open ? "pointer-events-none" : ""}`}
      >
        <div className="border-t border-zinc-100 px-6 pb-5 pt-3 dark:border-zinc-800">
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
            {visibilityLog.length === 0 ? (
              <li className="text-zinc-400 dark:text-zinc-500">No changes yet.</li>
            ) : (
              visibilityLog.map((r) => {
                const name = flavourNameById[r.flavour_id] ?? "Flavour";
                return (
                  <li key={r.id} className="text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{name}</span>
                    {" — "}
                    {r.set_visible ? (
                      <span className="text-[color:var(--brand-primary)]">shown</span>
                    ) : (
                      <span className="text-zinc-500">hidden</span>
                    )}
                    <span className="text-zinc-400 dark:text-zinc-500" title={r.changed_at}>
                      {" · "}
                      {formatVisibilityLogInstant(r.changed_at)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
