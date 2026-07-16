"use client";

import { useState } from "react";
import type { DashboardData } from "./types";

export function FlavourInsightsWidget({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  const rows = data.flavourInsights;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Flavour Insights</span>
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
        <div className="border-t border-zinc-100 px-6 pb-5 pt-4 dark:border-zinc-800">
          <p className="mb-3 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
            Vitrine display time vs. your salon profile age, plus how often each name appears in visit
            logs (matched by flavour name).
          </p>
          {rows.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Add vitrine flavours to see display share and log share stats.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {rows.map((row) => {
                const d = Math.round(row.displayPct);
                const l = Math.round(row.logSharePct);
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 border-b border-zinc-50 pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:w-[8.5rem] sm:shrink-0">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                        style={{ backgroundColor: row.colour }}
                      />
                      <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {row.name}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 sm:min-w-[6rem]">
                      <div className="mb-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-[color:var(--brand-primary)] transition-[width]"
                          style={{ width: `${Math.min(100, d)}%` }}
                        />
                      </div>
                      <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                        On display {d}% of the time
                      </p>
                    </div>
                    <p className="shrink-0 text-[10px] leading-tight text-zinc-600 tabular-nums dark:text-zinc-300 sm:w-[7rem] sm:text-right">
                      Chosen in {l}% of logs
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
