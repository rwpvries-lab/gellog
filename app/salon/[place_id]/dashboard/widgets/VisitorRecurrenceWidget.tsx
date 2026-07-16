"use client";

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "./types";

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export function VisitorRecurrenceWidget({ data }: { data: DashboardData }) {
  const rows = data.visitorRecurrence;
  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        New vs returning visitors
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={rows} barSize={14}>
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              labelFormatter={(label: unknown) => formatMonth(String(label))}
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: "none",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="new_visitors" name="New" stackId="v" fill="var(--brand-primary)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="returning_visitors" name="Returning" stackId="v" fill="var(--brand-secondary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
