import type { DashboardData } from "./types";

export function FlavourPerformanceWidget({ data }: { data: DashboardData }) {
  const rows = data.flavourPerformance;
  const maxCount = rows[0]?.log_count ?? 1;

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Flavour performance
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No flavour data yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((f) => (
            <div key={f.flavour_name} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs text-zinc-700 dark:text-zinc-300">
                {f.flavour_name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[color:var(--brand-primary)] transition-all"
                  style={{ width: `${Math.round((f.log_count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {f.log_count}
              </span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                ★{f.avg_rating.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
