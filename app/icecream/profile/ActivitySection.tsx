"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/src/lib/theme";

export type WeekData = {
  weekLabel: string;
  logs: number;
  flavours: number;
  salons: number;
};

type Metric = "logs" | "flavours" | "salons";

const METRIC_LABELS: Record<Metric, string> = {
  logs: "Logs",
  flavours: "Flavours",
  salons: "Salons",
};

export function ActivitySection({ weeklyData }: { weeklyData: WeekData[] }) {
  const [expanded, setExpanded] = useState(false);
  const [metric, setMetric] = useState<Metric>("logs");
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();

  // Guard against SSR — recharts uses window internally
  useEffect(() => setMounted(true), []);

  return (
    <section
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{
          borderBottom: expanded ? "1px solid var(--color-border)" : "none",
        }}
      >
        <p
          style={{
            color: "var(--color-text-primary)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Activity
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          Last 3 months
          <span
            style={{
              display: "inline-block",
              transition: "transform 200ms ease",
              transform: expanded ? "rotate(90deg)" : "none",
              fontSize: 10,
            }}
          >
            ▶
          </span>
        </button>
      </div>

      {/* Collapsible content */}
      <div
        style={{
          maxHeight: expanded ? 340 : 0,
          overflow: "hidden",
          transition: "max-height 320ms ease",
        }}
      >
        <div className="px-2 pb-2 pt-4">
          {mounted ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={weeklyData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 10, fill: theme.textTertiary }}
                  interval={2}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: theme.textTertiary }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: theme.surface,
                    border: `1px solid ${theme.borderDefault}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: theme.textPrimary,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  cursor={{ fill: theme.surfaceAlt }}
                />
                <Bar
                  dataKey={metric}
                  fill={theme.primaryOrange}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160 }} />
          )}
        </div>

        {/* Metric toggle pills */}
        <div className="flex gap-2 px-4 pb-4">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              style={{
                background:
                  metric === m
                    ? "var(--color-orange)"
                    : "var(--color-surface-alt)",
                color:
                  metric === m ? "white" : "var(--color-text-secondary)",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
