"use client";

import type { DashboardData } from "./types";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvExportWidget({ data }: { data: DashboardData }) {
  function handleExport() {
    const sections: string[] = [];

    sections.push("Visits by week\nweek,visits\n" + toCsv(data.weeklyVisits.map((r) => [r.week, r.visits])));
    sections.push(
      "\n\nFlavour performance\nflavour_name,log_count,avg_rating\n" +
        toCsv(data.flavourPerformance.map((r) => [r.flavour_name, r.log_count, r.avg_rating])),
    );
    sections.push(
      "\n\nNew vs returning visitors\nmonth,new_visitors,returning_visitors\n" +
        toCsv(data.visitorRecurrence.map((r) => [r.month, r.new_visitors, r.returning_visitors])),
    );
    sections.push(
      "\n\nDay-of-week distribution (0=Sun..6=Sat)\ndow,visits\n" +
        toCsv(data.dowDistribution.map((r) => [r.dow, r.visits])),
    );
    sections.push(
      "\n\nRating distribution\nrating,count\n" +
        toCsv(data.ratingHistogram.map((r) => [r.rating, r.count])),
    );
    if (data.vitrineConversion) {
      sections.push(
        "\n\nVitrine conversion\ntotal_logs,vitrine_matched_logs,conversion_pct\n" +
          toCsv([[data.vitrineConversion.total_logs, data.vitrineConversion.vitrine_matched_logs, data.vitrineConversion.conversion_pct]]),
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    download(`gellog-analytics-${data.placeId}-${dateStr}.csv`, sections.join(""));
  }

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Export analytics</h2>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Download every analytics widget's data as a single CSV file.
      </p>
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]"
      >
        Download CSV
      </button>
    </div>
  );
}
