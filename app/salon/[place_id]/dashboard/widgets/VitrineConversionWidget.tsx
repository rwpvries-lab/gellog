import type { DashboardData } from "./types";

export function VitrineConversionWidget({ data }: { data: DashboardData }) {
  const c = data.vitrineConversion;
  const hasData = c != null && c.total_logs > 0;

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Vitrine conversion</h2>
      <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500">
        Share of logged visits matching a current vitrine flavour
      </p>
      {!hasData ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough data yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full ring-8 ring-zinc-100 dark:ring-zinc-800">
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--brand-primary)" strokeWidth="4"
                strokeDasharray={`${(c!.conversion_pct / 100) * 100.5} 100.5`} strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {c!.conversion_pct.toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{c!.vitrine_matched_logs}</span>{" "}
              of {c!.total_logs} logged visits
            </p>
            <p className="mt-0.5">matched a vitrine flavour name.</p>
          </div>
        </div>
      )}
    </div>
  );
}
