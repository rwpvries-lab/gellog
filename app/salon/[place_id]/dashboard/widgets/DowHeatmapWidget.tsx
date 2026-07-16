import type { DashboardData } from "./types";

// Matches the Mon..Sun convention used by PeakTimesCard / salonPeakGrid.ts.
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const SQL_DOW_TO_GRID_ROW = [6, 0, 1, 2, 3, 4, 5]; // index = SQL EXTRACT(DOW)

export function DowHeatmapWidget({ data }: { data: DashboardData }) {
  const byRow = new Array<number>(7).fill(0);
  for (const row of data.dowDistribution) {
    const gridRow = SQL_DOW_TO_GRID_ROW[row.dow];
    if (gridRow != null) byRow[gridRow] = row.visits;
  }
  const max = Math.max(1, ...byRow);
  const hasData = data.dowDistribution.length > 0;

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Day-of-week distribution
      </h2>
      {!hasData ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough data yet.</p>
      ) : (
        <div className="flex items-end gap-2" style={{ height: 100 }}>
          {DOW_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-[color:var(--brand-primary)]"
                  style={{ height: `${Math.max(4, (byRow[i] / max) * 100)}%` }}
                  title={`${byRow[i]} visits`}
                />
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
