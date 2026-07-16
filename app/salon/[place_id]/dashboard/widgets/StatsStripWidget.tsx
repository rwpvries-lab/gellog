import type { DashboardData } from "./types";

export function StatsStripWidget({ data }: { data: DashboardData }) {
  const { stats } = data;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Total visits", value: stats.totalVisits.toString() },
        { label: "Avg rating", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—" },
        { label: "Top flavour", value: stats.mostLoggedFlavour ?? "—" },
        { label: "This month", value: stats.visitsThisMonth.toString() },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-0.5 truncate text-base font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
        </div>
      ))}
    </div>
  );
}
