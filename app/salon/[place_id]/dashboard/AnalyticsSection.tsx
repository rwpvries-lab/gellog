"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";

export type WeeklyVisit = { week: string; visits: number };
export type TopFlavour = { flavour_name: string; count: number; avg_rating: number };
export type WeatherStat = { weather_condition: string; visits: number };
export type MonthlyRating = { month: string; avg_rating: number };

export type FlavourInsightRow = {
  id: string;
  name: string;
  colour: string;
  displayPct: number;
  logSharePct: number;
};

type Props = {
  tier: "free" | "basic" | "pro";
  placeId: string;
  weeklyVisits: WeeklyVisit[];
  topFlavours: TopFlavour[];
  weatherStats: WeatherStat[];
  monthlyRatings: MonthlyRating[];
};

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  windy: "💨",
  snowy: "❄️",
  stormy: "⛈️",
  foggy: "🌫️",
  hot: "🥵",
};

function weatherEmoji(condition: string) {
  return WEATHER_EMOJI[condition.toLowerCase()] ?? "🌡️";
}

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatWeek(week: string) {
  // week is like "2026-03-23"
  const d = new Date(week);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ProLockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"
      />
    </svg>
  );
}

export function AnalyticsSection({
  tier,
  placeId,
  weeklyVisits,
  topFlavours,
  weatherStats,
  monthlyRatings,
}: Props) {
  const isBasicOrPro = tier === "basic" || tier === "pro";
  const isPro = tier === "pro";

  if (!isBasicOrPro) {
    return (
      <div className="mb-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="px-6 py-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Analytics
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Upgrade to Salon Basic to unlock visit analytics, top flavours, and weather insights.
          </p>

          {/* Blurred placeholder */}
          <div className="relative select-none overflow-hidden rounded-2xl">
            <div className="pointer-events-none blur-sm">
              <div className="mb-3 h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex gap-2">
                {[60, 80, 50, 90, 70].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 rounded-full bg-zinc-200 dark:bg-zinc-700"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 dark:bg-zinc-900/60">
              <SalonUpgradeButtonInline place_id={placeId} tier="basic" label="Upgrade to Salon Basic — €9/mo" className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxFlavourCount = topFlavours[0]?.count ?? 1;

  return (
    <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Analytics
      </h2>

      {/* 1. Visits Over Time */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Visits — last 12 weeks
        </p>
        {weeklyVisits.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No visits recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyVisits} barSize={14}>
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
              <Bar dataKey="visits" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Top Flavours */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Top flavours
        </p>
        {topFlavours.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No flavour data yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topFlavours.map((f) => (
              <div key={f.flavour_name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {f.flavour_name}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-teal-400 dark:bg-teal-500 transition-all"
                    style={{ width: `${Math.round((f.count / maxFlavourCount) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {f.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Weather Insights */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Weather when people visit
        </p>
        {weatherStats.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No weather data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weatherStats.map((w) => (
              <span
                key={w.weather_condition}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {weatherEmoji(w.weather_condition)}{" "}
                {w.weather_condition.charAt(0).toUpperCase() + w.weather_condition.slice(1)}{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{w.visits}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Rating Trend — Pro only */}
      {isPro ? (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Rating trend
          </p>
          {monthlyRatings.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={monthlyRatings}>
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(2) : String(v), "avg rating"]}
                  labelFormatter={(label: unknown) => formatMonth(String(label))}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    border: "none",
                    background: "#18181b",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_rating"
                  stroke="var(--color-orange)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-orange)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
          <div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Rating trend</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Pro plan only</p>
          </div>
          <SalonUpgradeButtonInline place_id={placeId} tier="pro" label="Upgrade to Pro" className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500" />
        </div>
      )}
    </div>
  );
}

/** Flavour insights — used below Analytics on the dashboard; collapsible wrapper lives here. */
export function FlavourInsightsCollapsibleSection({
  tier,
  placeId,
  flavourInsights,
}: {
  tier: "free" | "basic" | "pro";
  placeId: string;
  flavourInsights: FlavourInsightRow[];
}) {
  const [open, setOpen] = useState(false);
  const isPro = tier === "pro";

  return (
    <div className="mb-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Flavour Insights</span>
        <span
          className={`inline-block shrink-0 text-zinc-400 transition-transform duration-200 ease-out dark:text-zinc-500 ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ▶
        </span>
      </button>
      <div
        id="dashboard-flavour-insights-panel"
        aria-hidden={!open}
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[4000px]" : "max-h-0"
        } ${!open ? "pointer-events-none" : ""}`}
      >
        <div className="border-t border-zinc-100 px-6 pb-5 pt-4 dark:border-zinc-800">
            {isPro ? (
              <>
                <p className="mb-3 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
                  Vitrine display time vs. your salon profile age, plus how often each name appears in
                  visit logs (matched by flavour name).
                </p>
                {flavourInsights.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Add vitrine flavours to see display share and log share stats.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {flavourInsights.map((row) => {
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
                                className="h-full rounded-full bg-orange-400 transition-[width] dark:bg-orange-500"
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
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <ProLockIcon className="shrink-0 text-orange-500 dark:text-orange-400" />
                  <div>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Flavour Insights
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      Unlock display time and log share per vitrine flavour on Pro.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <SalonUpgradeButtonInline
                    place_id={placeId}
                    tier="pro"
                    label="Upgrade to Pro"
                    className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
                  />
                  <a
                    href="#billing"
                    className="text-center text-[11px] font-medium text-orange-600 hover:underline dark:text-orange-400 sm:text-right"
                  >
                    View billing & plans
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

// Inline upgrade button (no useState needed in this sub-component context)
function SalonUpgradeButtonInline({
  place_id,
  tier,
  label,
  className,
}: {
  place_id: string;
  tier: "basic" | "pro";
  label: string;
  className: string;
}) {
  async function handleClick() {
    const res = await fetch("/api/stripe/salon-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id, tier }),
    });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${className}`}
    >
      {label}
    </button>
  );
}
