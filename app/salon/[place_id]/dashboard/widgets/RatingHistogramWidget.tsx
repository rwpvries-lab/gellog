import type { DashboardData } from "./types";

export function RatingHistogramWidget({ data }: { data: DashboardData }) {
  const rows = data.ratingHistogram;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const hasData = rows.length > 0 && rows.some((r) => r.count > 0);

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Rating distribution
      </h2>
      {!hasData ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough ratings yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...rows].reverse().map((r) => (
            <div key={r.rating} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {r.rating}★
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[color:var(--brand-primary)]"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
