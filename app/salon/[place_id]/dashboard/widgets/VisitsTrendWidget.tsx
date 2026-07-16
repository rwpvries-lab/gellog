"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "./types";

function formatWeek(week: string) {
  const d = new Date(week);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function VisitsTrendWidget({ data }: { data: DashboardData }) {
  const { weeklyVisits } = data;
  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Visits & rating trend
      </h2>
      <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500">Last 26 weeks</p>
      {weeklyVisits.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No visits recorded yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weeklyVisits} barSize={8}>
            <XAxis
              dataKey="week"
              tickFormatter={formatWeek}
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              formatter={(v: unknown) => [String(v), "visits"]}
              labelFormatter={(label: unknown) => formatWeek(String(label))}
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: "none",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
            />
            <Bar dataKey="visits" fill="var(--color-teal)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
